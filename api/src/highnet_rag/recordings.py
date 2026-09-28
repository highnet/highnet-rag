"""Pre-recorded demo questions: recorded once with the real models, replayed to visitors.

Visitors pick from a fixed list; every setting a visitor can choose (search mode, top-k 3/5/10,
chunk size, reranker, and agentic mode for the compound questions) was run once through the
real pipeline, and the page replays that run's trace. The request step is checked live on each
replay, so its rate-limit and budget numbers are real; it also says when the run was recorded.
"""

import asyncio
import itertools
import json
import time
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from highnet_rag.budget import budget_state, rate_state
from highnet_rag.pipeline.classic import new_run_id, run_classic
from highnet_rag.pipeline.deps import SUPPORTED_MODES, Deps, QueryParams
from highnet_rag.pipeline.search import Event
from highnet_rag.pricing import cost_usd
from highnet_rag.providers import Providers
from highnet_rag.providers.cache import CachedAnswerModel, CachedEmbedder
from highnet_rag.storage.base import DemoQuestion, Recording, RecordingStore
from highnet_rag.trace import AnswerDelta, RunDone, StageClock, TraceEvent, Tracer

RECORDED_KS = (3, 5, 10)
# A replay keeps the recorded pace, but no pause longer than this (model waits included).
MAX_GAP_MS = 1500
REPLAY_NOTE = (
    "Replayed from a recording made with {models}; no model is called for this run. "
    "The rate limit and budget below are checked now."
)
STAND_INS = "the offline stand-ins, so its scores, tokens and answer are illustrative"


def replay_note(request_data: dict[str, Any]) -> str:
    """Name the models the run was recorded with, from its own request event."""
    models = request_data["models"]
    if "fake" in {models["embed"]["provider"], models["answer"]["provider"]}:
        return REPLAY_NOTE.format(models=STAND_INS)
    return REPLAY_NOTE.format(
        models=f"the real models ({models['embed']['model']}, {models['answer']['model']})"
    )


def combo_key(params: QueryParams) -> str:
    return "|".join(
        [
            params.mode,
            str(params.k),
            params.chunk_set,
            str(int(params.rerank)),
            str(int(params.agentic)),
        ]
    )


def grid(question: DemoQuestion, chunk_sets: list[str]) -> list[QueryParams]:
    """Every setting a visitor can choose for this question."""
    agent = (False, True) if question.compound else (False,)
    return [
        QueryParams(
            q=question.question, mode=mode, k=k, chunk_set=size, rerank=rerank, agentic=agentic
        )
        for agentic, mode, k, size, rerank in itertools.product(
            agent, SUPPORTED_MODES, RECORDED_KS, chunk_sets, (False, True)
        )
    ]


@dataclass
class Spent:
    provider: str
    model: str
    cost_usd: float


@dataclass
class RecorderState:
    """The recorder's own state: no rate limit, no visitor budget (the owner pays for it)."""

    spent: list[Spent] = field(default_factory=list)

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
        self.spent.append(Spent(provider, model, cost_usd))

    def month_spend(self) -> float:
        return 0.0

    def runs_since(self, ip_hash: str, seconds: int) -> int:
        return 0


@dataclass
class RecordReport:
    recorded: int = 0
    skipped: int = 0
    failed: list[str] = field(default_factory=list)
    cost_usd: float = 0.0


def _item(item: Event, at_ms: int) -> dict[str, Any]:
    kind = (
        "trace"
        if isinstance(item, TraceEvent)
        else "answer_delta"
        if isinstance(item, AnswerDelta)
        else "done"
    )
    return {"type": kind, "at_ms": at_ms, "data": item.model_dump(mode="json")}


async def record(
    questions: list[DemoQuestion],
    deps: Deps,
    store: RecordingStore,
    log: Callable[[str], None] = print,
    concurrency: int = 1,
) -> RecordReport:
    """Record every question at every setting not yet in the store (so a rerun resumes).

    The model and the embedder sit behind caches: settings that send the same passages, or an
    agent the same first turn, reuse one call. Each recording still shows that call's own tokens
    and cost; the report's cost counts only calls actually made.
    """
    state = RecorderState()
    answer = CachedAnswerModel(deps.providers.answer)
    providers = Providers(
        embedder=CachedEmbedder(deps.providers.embedder),
        reranker=deps.providers.reranker,
        answer=answer,
    )
    rig = Deps(deps.settings, deps.corpus, state, providers)
    chunk_sets = [s.name for s in deps.corpus.chunk_sets()]
    store.save_questions(questions)
    report = RecordReport()
    semaphore = asyncio.Semaphore(concurrency)

    async def one_question(question: DemoQuestion) -> None:
        async with semaphore:
            done_combos = store.combos(question.id)
            for params in grid(question, chunk_sets):
                key = combo_key(params)
                if key in done_combos:
                    report.skipped += 1
                    continue
                started = time.perf_counter()
                items: list[dict[str, Any]] = []
                status = "unfinished"
                async for item in run_classic(params, rig, "recorder"):
                    items.append(_item(item, round((time.perf_counter() - started) * 1000)))
                    if isinstance(item, RunDone):
                        status = item.status
                if status != "ok":
                    report.failed.append(f"{question.id} {key}: {status}")
                    log(f"  failed {question.id} {key}: {status}")
                    continue
                recorded_at = datetime.now(UTC).isoformat(timespec="seconds")
                store.save(Recording(question.id, key, recorded_at, items))
                report.recorded += 1
            log(f"{question.id}: done ({report.recorded} recorded so far)")

    # Questions record side by side; each question's settings run in turn, so its first agent
    # turn and repeated passage sets hit the cache.
    await asyncio.gather(*(one_question(q) for q in questions))
    model = answer.model
    report.cost_usd = round(
        sum(s.cost_usd for s in state.spent if s.model != model)
        + sum(
            cost_usd(model, deps.settings, u.input_tokens, u.output_tokens) for u in answer.misses
        ),
        6,
    )
    return report


async def replay(
    recording: Recording,
    params: QueryParams,
    deps: Deps,
    ip_hash: str,
) -> AsyncIterator[Event]:
    """Stream a recording under a fresh run id, after a live request check."""
    settings, state = deps.settings, deps.state
    tracer = Tracer(new_run_id())
    clock = StageClock()
    rate = rate_state(state, ip_hash, settings)
    budget = budget_state(state, settings)
    state.record_run(tracer.run_id, ip_hash, json.dumps(params.model_dump()))
    first, rest = recording.items[0], recording.items[1:]
    data = {
        **first["data"]["data"],
        "run_id": tracer.run_id,
        "rate_limit": rate.as_dict(),
        "budget": budget.as_dict(),
        "recording": {
            "recorded_at": recording.recorded_at,
            "note": replay_note(first["data"]["data"]),
        },
    }
    if rate.limited:
        data["error"] = {
            "type": "rate_limited",
            "message": "You've reached the query limit for now. Try again later.",
        }
        yield tracer.event("request", clock, data, status="error")
        done = tracer.done("limited")
        state.finish_run(tracer.run_id, done.status, done.ms, 0.0)
        yield done
        return
    yield tracer.event("request", clock, data)
    previous = first["at_ms"]
    for item in rest:
        gap = min(item["at_ms"] - previous, MAX_GAP_MS) / settings.replay_speed
        previous = item["at_ms"]
        if gap > 0:
            await asyncio.sleep(gap / 1000)
        payload = {**item["data"], "run_id": tracer.run_id}
        if item["type"] == "trace":
            yield TraceEvent.model_validate(payload)
        elif item["type"] == "answer_delta":
            yield AnswerDelta.model_validate(payload)
        else:
            done = RunDone.model_validate(payload)
            state.finish_run(tracer.run_id, done.status, done.ms, 0.0)
            yield done
