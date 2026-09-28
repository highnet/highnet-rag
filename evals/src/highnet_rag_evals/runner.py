"""The eval run: the real pipeline, offline, over the golden sets.

1. Retrieval: every answerable question through every retrieval configuration (mode x chunk set
   x reranker), ranked to depth 10 once; recall@k and MRR read the top k of that list.
2. Answers: every squad_auto and owner question through the default configuration, end to end,
   graded by the judge for faithfulness and correctness; abstention on unanswerable questions.
3. Compound: the cross-article questions through the classic pipeline and through agentic mode.

Every call goes through the pipeline's own stages, so it is priced by `pricing.py` and recorded
in this run's own ledger. Eval spend never touches the visitor budget.
"""

import asyncio
import itertools
import os
import time
from collections import defaultdict
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

from highnet_rag.budget import budget_state
from highnet_rag.config import Settings
from highnet_rag.pipeline.classic import new_run_id, run_classic
from highnet_rag.pipeline.deps import DEFAULT_MODE, SUPPORTED_MODES, Deps, QueryParams
from highnet_rag.pipeline.prompt import NOT_FOUND
from highnet_rag.pipeline.search import Retrieval, retrieve
from highnet_rag.pricing import cost_usd
from highnet_rag.providers import Providers
from highnet_rag.providers.base import Embedder, Embeddings, InputType, Judge
from highnet_rag.storage.base import CorpusStore
from highnet_rag.trace import RunDone, TraceEvent, Tracer
from highnet_rag_evals.golden import CompoundRow, Golden, evidence_span
from highnet_rag_evals.judge import Grade, grade_answer
from highnet_rag_evals.metrics import mean, recall_at_k, reciprocal_rank, relevant_chunks
from highnet_rag_evals.results import (
    RECALL_KS,
    AnswerableResults,
    AnswerConfig,
    AnswerResults,
    CompoundResults,
    CostLine,
    CostResults,
    EvalResults,
    GoldenSetInfo,
    ModelRef,
    Rate,
    RetrievalConfig,
    RetrievalResults,
    RunInfo,
    UnanswerableResults,
)

RANK_DEPTH = 10
ANSWER_CHUNK_SET = "medium"
IP_HASH = "evals"
Log = Callable[[str], None]


@dataclass
class SpendLine:
    run_id: str | None
    provider: str
    model: str
    stage: str
    input_tokens: int
    output_tokens: int
    cost_usd: float


@dataclass
class Ledger:
    """This run's own state store: every call is recorded; rate limits and the visitor budget
    do not apply (the owner pays for eval runs, and their cost is published with the results)."""

    lines: list[SpendLine] = field(default_factory=list)  # a cached embedding records 0 tokens

    def record_run(self, run_id: str, ip_hash: str, settings_json: str) -> None:
        return None

    def finish_run(self, run_id: str, status: str, ms: int, cost_usd: float) -> None:
        return None

    def record_spend(
        self,
        run_id: str | None,
        provider: str,
        model: str,
        stage: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
    ) -> None:
        self.lines.append(
            SpendLine(run_id, provider, model, stage, input_tokens, output_tokens, cost_usd)
        )

    def month_spend(self) -> float:
        return 0.0

    def runs_since(self, ip_hash: str, seconds: int) -> int:
        return 0

    def total(self) -> float:
        return sum(ln.cost_usd for ln in self.lines)

    def by_model(self) -> list[CostLine]:
        groups: dict[tuple[str, str], list[SpendLine]] = defaultdict(list)
        for ln in self.lines:
            groups[(ln.provider, ln.model)].append(ln)
        return [
            CostLine(
                provider=provider,
                model=model,
                calls=sum(1 for ln in lines if ln.input_tokens or ln.output_tokens),
                input_tokens=sum(ln.input_tokens for ln in lines),
                output_tokens=sum(ln.output_tokens for ln in lines),
                cost_usd=round(sum(ln.cost_usd for ln in lines), 6),
            )
            for (provider, model), lines in sorted(groups.items())
        ]


class CachedEmbedder:
    """Each question is embedded once for the whole run; a repeat costs nothing and says so
    (the trace shows 0 tokens for it)."""

    def __init__(self, inner: Embedder) -> None:
        self._inner = inner
        self.provider, self.model, self.dims = inner.provider, inner.model, inner.dims
        self._cache: dict[tuple[str, str], Embeddings] = {}

    async def embed(self, texts: list[str], input_type: InputType) -> Embeddings:
        key = ("\n".join(texts), input_type)
        if key in self._cache:
            return Embeddings(self._cache[key].vectors, tokens=0)
        result = await self._inner.embed(texts, input_type)
        self._cache[key] = result
        return result


@dataclass
class Question:
    """An answerable question with its gold spans in one article (squad_auto or owner)."""

    id: str
    set: str
    question: str
    doc_id: int
    spans: list[tuple[int, int]]


def normalise_title(title: str) -> str:
    return title.replace("_", " ").strip().casefold()


def gold_questions(golden: Golden, corpus: CorpusStore) -> list[Question]:
    doc_ids = {normalise_title(t): i for i, t in corpus.documents().items()}
    questions: list[Question] = []
    for row in golden.squad_auto:
        doc_id = doc_ids.get(normalise_title(row.article))
        if row.answerable and doc_id is not None:
            spans = [(a.start, a.end) for a in row.answers]
            questions.append(Question(row.id, "squad_auto", row.question, doc_id, spans))
    for row in golden.owner:
        doc_id = doc_ids.get(normalise_title(row.article))
        if not row.answerable or doc_id is None:
            continue
        span = evidence_span(corpus.document_text(doc_id), row.evidence)
        if span is not None:
            questions.append(Question(row.id, "owner", row.question, doc_id, [span]))
    return questions


async def bounded[T](limit: int, jobs: Sequence[Callable[[], Awaitable[T]]]) -> list[T]:
    semaphore = asyncio.Semaphore(limit)

    async def run(job: Callable[[], Awaitable[T]]) -> T:
        async with semaphore:
            return await job()

    return await asyncio.gather(*(run(job) for job in jobs))


@dataclass
class RunOutcome:
    """What one end-to-end pipeline run produced, read from its trace."""

    status: str  # the done event's status, or "unfinished" if the stream ended without one
    answer: str
    passages: list[str]
    context_ids: list[int]
    context_titles: list[str]
    abstained: bool
    searches: int
    ms: int
    tokens: int
    cost_usd: float

    @property
    def ok(self) -> bool:
        return self.status == "ok"


def read_outcome(events: list[TraceEvent], done: RunDone | None) -> RunOutcome:
    by_stage = {e.stage: e for e in events if not e.parent}
    context = by_stage["select_context"].data["chunks"] if "select_context" in by_stage else []
    generate = by_stage.get("generate")
    answer = str(generate.data.get("answer", "")) if generate else ""
    return RunOutcome(
        status=done.status if done else "unfinished",
        answer=answer,
        passages=[c["text"] for c in context],
        context_ids=[c["chunk_id"] for c in context],
        context_titles=[c["doc_title"] for c in context],
        abstained=NOT_FOUND in answer,
        searches=sum(
            1 for e in events if e.stage == "agent_step" and e.data.get("tool") == "search"
        ),
        ms=done.ms if done else 0,
        tokens=done.tokens if done else 0,
        cost_usd=done.cost_usd if done else 0.0,
    )


class Evaluator:
    def __init__(
        self,
        settings: Settings,
        corpus: CorpusStore,
        providers: Providers,
        judge: Judge,
        *,
        concurrency: int = 6,
        log: Log = print,
    ) -> None:
        self.settings = settings
        self.corpus = corpus
        self.ledger = Ledger()
        self.providers = Providers(
            embedder=CachedEmbedder(providers.embedder),
            reranker=providers.reranker,
            answer=providers.answer,
        )
        self.deps = Deps(settings, corpus, self.ledger, self.providers)
        self.judge = judge
        self.concurrency = concurrency
        self.log = log
        self.details: list[dict[str, Any]] = []

    # 1 · Retrieval --------------------------------------------------------------------------

    async def ranked(
        self, q: str, mode: str, chunk_set: str, rerank: bool
    ) -> tuple[list[int], int]:
        chunk_set_row = next(s for s in self.corpus.chunk_sets() if s.name == chunk_set)
        params = QueryParams(q=q, mode=mode, k=RANK_DEPTH, rerank=rerank, chunk_set=chunk_set)  # pyright: ignore[reportArgumentType]
        tracer, out = Tracer(new_run_id()), Retrieval()
        budget = budget_state(self.ledger, self.settings)

        def spend(stage: str, provider: str, model: str, tin: int, tout: int, cost: float) -> None:
            self.ledger.record_spend(tracer.run_id, provider, model, stage, tin, tout, cost)

        events = [
            e
            async for e in retrieve(
                q, params, self.deps, tracer, chunk_set_row, budget, spend, out, with_map=False
            )
            if isinstance(e, TraceEvent)
        ]
        if out.failed:
            failure = next(e for e in events if e.status == "error")
            raise RuntimeError(failure.data["error"]["message"])
        ms = sum(e.ms for e in events)
        return [cid for cid, _ in out.selected], ms

    async def retrieval(self, questions: list[Question]) -> RetrievalResults:
        sets = [s.name for s in self.corpus.chunk_sets()]
        relevant: dict[str, dict[str, set[int]]] = {}
        unmatched: dict[str, int] = {}
        for name in sets:
            set_id = next(s.id for s in self.corpus.chunk_sets() if s.name == name)
            by_doc: dict[int, list[tuple[int, int, int]]] = defaultdict(list)
            for span in self.corpus.spans(set_id):
                by_doc[span.doc_id].append((span.chunk_id, span.start, span.end))
            relevant[name] = {q.id: relevant_chunks(q.spans, by_doc[q.doc_id]) for q in questions}
            unmatched[name] = sum(1 for q in questions if not relevant[name][q.id])

        configs = [
            await self.retrieval_config(questions, relevant[chunk_set], mode, chunk_set, rerank)
            for chunk_set, mode, rerank in itertools.product(sets, SUPPORTED_MODES, (False, True))
        ]
        return RetrievalResults(
            depth=RANK_DEPTH,
            ks=list(RECALL_KS),
            questions=len(questions),
            unmatched=unmatched,
            configs=configs,
        )

    async def retrieval_config(
        self,
        questions: list[Question],
        relevant: dict[str, set[int]],
        mode: str,
        chunk_set: str,
        rerank: bool,
    ) -> RetrievalConfig:
        scored = [q for q in questions if relevant[q.id]]
        self.log(f"retrieval {mode} / {chunk_set} / rerank {rerank}: {len(scored)} questions")
        before = len(self.ledger.lines)

        async def one(q: Question) -> tuple[Question, list[int], int] | Exception:
            try:
                ids, ms = await self.ranked(q.question, mode, chunk_set, rerank)
                return q, ids, ms
            except Exception as exc:
                return exc

        results = await bounded(self.concurrency, [lambda q=q: one(q) for q in scored])
        good = [r for r in results if not isinstance(r, Exception)]
        errors = [r for r in results if isinstance(r, Exception)]
        for error in errors[:3]:
            self.log(f"  error: {error}")
        return RetrievalConfig(
            mode=mode,
            chunk_set=chunk_set,
            rerank=rerank,
            questions=len(good),
            errors=len(errors),
            recall={
                str(k): round(mean([recall_at_k(ids, relevant[q.id], k) for q, ids, _ in good]), 4)
                for k in RECALL_KS
            },
            mrr=round(mean([reciprocal_rank(ids, relevant[q.id]) for q, ids, _ in good]), 4),
            mean_ms=round(mean([float(ms) for _, _, ms in good]), 1),
            cost_usd=round(sum(ln.cost_usd for ln in self.ledger.lines[before:]), 6),
        )

    # 2 · Answers ----------------------------------------------------------------------------

    async def run_pipeline(self, params: QueryParams) -> RunOutcome:
        events: list[TraceEvent] = []
        done: RunDone | None = None
        async for item in run_classic(params, self.deps, IP_HASH):
            if isinstance(item, TraceEvent):
                events.append(item)
            elif isinstance(item, RunDone):
                done = item
        return read_outcome(events, done)

    async def grade(self, question: str, outcome: RunOutcome, expected: str | None) -> Grade | None:
        """Answers that abstain are not graded: there is no claim to check."""
        if outcome.abstained or not outcome.answer.strip():
            return None
        grade = await grade_answer(self.judge, question, outcome.passages, outcome.answer, expected)
        cost = cost_usd(self.judge.model, self.settings, grade.input_tokens, grade.output_tokens)
        self.ledger.record_spend(
            None,
            self.judge.provider,
            self.judge.model,
            "judge",
            grade.input_tokens,
            grade.output_tokens,
            cost,
        )
        return grade

    def answer_config(self) -> AnswerConfig:
        return AnswerConfig(
            mode=DEFAULT_MODE,
            chunk_set=ANSWER_CHUNK_SET,
            k=self.settings.default_top_k,
            rerank=False,
        )

    async def answers(self, golden: Golden, questions: list[Question]) -> AnswerResults:
        config = self.answer_config()
        spans = {q.id: q for q in questions}
        medium = next(s.id for s in self.corpus.chunk_sets() if s.name == config.chunk_set)
        by_doc: dict[int, list[tuple[int, int, int]]] = defaultdict(list)
        for span in self.corpus.spans(medium):
            by_doc[span.doc_id].append((span.chunk_id, span.start, span.end))

        rows: list[tuple[str, str, bool, str | None]] = [
            (r.id, r.question, r.answerable, r.answers[0].text if r.answers else None)
            for r in golden.squad_auto
        ] + [(r.id, r.question, r.answerable, r.answer or None) for r in golden.owner]
        self.log(f"answers: {len(rows)} questions")

        async def one(row: tuple[str, str, bool, str | None]) -> dict[str, Any]:
            qid, question, answerable, expected = row
            params = QueryParams(
                q=question,
                mode=config.mode,  # pyright: ignore[reportArgumentType]
                k=config.k,
                rerank=config.rerank,
                chunk_set=config.chunk_set,
            )
            try:
                outcome = await self.run_pipeline(params)
                grade = (
                    await self.grade(question, outcome, expected if answerable else None)
                    if outcome.ok
                    else None
                )
            except Exception as exc:
                return {"id": qid, "answerable": answerable, "error": str(exc)}
            gold = spans.get(qid)
            evidence = (
                bool(relevant_chunks(gold.spans, by_doc[gold.doc_id]) & set(outcome.context_ids))
                if gold
                else None
            )
            return {
                "id": qid,
                "answerable": answerable,
                "error": None if outcome.ok else f"run ended {outcome.status}",
                "question": question,
                "expected": expected,
                "answer": outcome.answer,
                "abstained": outcome.abstained,
                "evidence_in_context": evidence,
                "supported": grade.supported if grade else None,
                "sentences": grade.sentences if grade else None,
                "correct": grade.correct if grade else None,
                "ms": outcome.ms,
                "cost_usd": outcome.cost_usd,
            }

        records = await bounded(self.concurrency, [lambda r=r: one(r) for r in rows])
        self.details += [{"part": "answers", **r} for r in records]
        ok = [r for r in records if not r["error"]]
        yes = [r for r in ok if r["answerable"]]
        no = [r for r in ok if not r["answerable"]]
        judged_yes = [r for r in yes if r["sentences"] is not None]
        judged_no = [r for r in no if r["sentences"] is not None]
        with_evidence = [r for r in yes if r["evidence_in_context"]]
        return AnswerResults(
            config=config,
            answerable=AnswerableResults(
                questions=sum(1 for r in records if r["answerable"]),
                errors=sum(1 for r in records if r["answerable"] and r["error"]),
                abstained=Rate.of_counts(sum(r["abstained"] for r in yes), len(yes)),
                correct=Rate.of_counts(sum(r["correct"] is True for r in yes), len(yes)),
                evidence_in_context=Rate.of_counts(
                    len(with_evidence), sum(r["evidence_in_context"] is not None for r in yes)
                ),
                correct_with_evidence=Rate.of_counts(
                    sum(r["correct"] is True for r in with_evidence), len(with_evidence)
                ),
                faithfulness=faithfulness(judged_yes),
                fully_supported=fully_supported(judged_yes),
            ),
            unanswerable=UnanswerableResults(
                questions=sum(1 for r in records if not r["answerable"]),
                errors=sum(1 for r in records if not r["answerable"] and r["error"]),
                abstained=Rate.of_counts(sum(r["abstained"] for r in no), len(no)),
                faithfulness=faithfulness(judged_no),
                fully_supported=fully_supported(judged_no),
            ),
            mean_ms=round(mean([float(r["ms"]) for r in ok]), 1),
            mean_cost_usd=round(mean([r["cost_usd"] for r in ok]), 6),
        )

    # 3 · Compound ---------------------------------------------------------------------------

    async def compound(self, rows: list[CompoundRow]) -> list[CompoundResults]:
        return [
            await self.compound_pipeline(rows, "classic"),
            await self.compound_pipeline(rows, "agentic"),
        ]

    async def compound_pipeline(
        self, rows: list[CompoundRow], pipeline: Literal["classic", "agentic"]
    ) -> CompoundResults:
        config = self.answer_config()
        self.log(f"compound {pipeline}: {len(rows)} questions")

        async def one(row: CompoundRow) -> dict[str, Any]:
            params = QueryParams(
                q=row.question,
                mode=config.mode,  # pyright: ignore[reportArgumentType]
                k=config.k,
                chunk_set=config.chunk_set,
                agentic=pipeline == "agentic",
            )
            try:
                outcome = await self.run_pipeline(params)
                grade = await self.grade(row.question, outcome, row.answer) if outcome.ok else None
            except Exception as exc:
                return {"id": row.id, "error": str(exc)}
            needed = {normalise_title(a) for a in row.articles}
            found = needed & {normalise_title(t) for t in outcome.context_titles}
            return {
                "id": row.id,
                "pipeline": pipeline,
                "error": None if outcome.ok else f"run ended {outcome.status}",
                "question": row.question,
                "answer": outcome.answer,
                "coverage": len(found) / len(needed) if needed else 1.0,
                "abstained": outcome.abstained,
                "correct": grade.correct if grade else None,
                "supported": grade.supported if grade else None,
                "sentences": grade.sentences if grade else None,
                "searches": outcome.searches,
                "tokens": outcome.tokens,
                "ms": outcome.ms,
                "cost_usd": outcome.cost_usd,
            }

        records = await bounded(self.concurrency, [lambda r=r: one(r) for r in rows])
        self.details += [{"part": "compound", **r} for r in records]
        ok = [r for r in records if not r["error"]]
        judged = [r for r in ok if r["sentences"] is not None]
        return CompoundResults(
            pipeline=pipeline,
            questions=len(records),
            errors=len(records) - len(ok),
            all_articles_found=Rate.of_counts(sum(r["coverage"] == 1.0 for r in ok), len(ok)),
            article_coverage=round(mean([r["coverage"] for r in ok]), 4),
            correct=Rate.of_counts(sum(r["correct"] is True for r in ok), len(ok)),
            abstained=Rate.of_counts(sum(r["abstained"] for r in ok), len(ok)),
            faithfulness=faithfulness(judged),
            mean_searches=round(mean([float(r["searches"]) for r in ok]), 2),
            mean_tokens=round(mean([float(r["tokens"]) for r in ok]), 1),
            mean_ms=round(mean([float(r["ms"]) for r in ok]), 1),
            mean_cost_usd=round(mean([r["cost_usd"] for r in ok]), 6),
        )

    # The whole run ------------------------------------------------------------------------

    async def run(self, golden: Golden) -> EvalResults:
        started, clock = datetime.now(UTC), time.monotonic()
        questions = gold_questions(golden, self.corpus)
        retrieval = await self.retrieval(questions)
        answers = await self.answers(golden, questions)
        compound = await self.compound(golden.compound)
        meta = self.corpus.meta()
        p = self.providers
        return EvalResults(
            run=RunInfo(
                started_at=started.isoformat(timespec="seconds"),
                finished_at=datetime.now(UTC).isoformat(timespec="seconds"),
                duration_s=round(time.monotonic() - clock, 1),
                git_sha=os.environ.get("GITHUB_SHA"),
                illustrative=p.answer.provider == "fake" or self.judge.provider == "fake",
                corpus_build_id=meta.get("build_id", ""),
                corpus_built_at=meta.get("built_at", ""),
                embed=ModelRef(provider=p.embedder.provider, model=p.embedder.model),
                rerank=ModelRef(provider=p.reranker.provider, model=p.reranker.model),
                answer=ModelRef(provider=p.answer.provider, model=p.answer.model),
                judge=ModelRef(provider=self.judge.provider, model=self.judge.model),
            ),
            golden=golden_info(golden),
            retrieval=retrieval,
            answers=answers,
            compound=compound,
            cost=CostResults(
                total_usd=round(self.ledger.total(), 6), by_model=self.ledger.by_model()
            ),
        )


def faithfulness(judged: list[dict[str, Any]]) -> float | None:
    if not judged:
        return None
    return round(mean([r["supported"] / r["sentences"] for r in judged]), 4)


def fully_supported(judged: list[dict[str, Any]]) -> Rate:
    return Rate.of_counts(sum(r["supported"] == r["sentences"] for r in judged), len(judged))


def golden_info(golden: Golden) -> list[GoldenSetInfo]:
    def info(name: str, flags: list[bool]) -> GoldenSetInfo:
        return GoldenSetInfo(
            name=name,  # pyright: ignore[reportArgumentType]
            questions=len(flags),
            answerable=sum(flags),
            unanswerable=len(flags) - sum(flags),
        )

    return [
        info("squad_auto", [r.answerable for r in golden.squad_auto]),
        info("owner", [r.answerable for r in golden.owner]),
        info("compound", [True for _ in golden.compound]),
    ]
