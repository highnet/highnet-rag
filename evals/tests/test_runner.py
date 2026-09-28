from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from conftest import fake_settings

from highnet_rag.ingest.squad import load_squad
from highnet_rag.providers import Providers, build_providers
from highnet_rag.providers.base import Embeddings, FinalAnswer, InputType, ToolAnswer
from highnet_rag.providers.fake import FakeAnswerModel
from highnet_rag.storage.sqlite import SqliteCorpusStore
from highnet_rag_evals.golden import CompoundRow, Golden, OwnerRow, build_squad_auto
from highnet_rag_evals.judge import FakeJudge
from highnet_rag_evals.runner import CachedEmbedder, Evaluator, Ledger, read_outcome


def golden_for(squad_path: Path) -> Golden:
    return Golden(
        squad_auto=build_squad_auto(load_squad(squad_path)),
        owner=[
            OwnerRow(
                id="own-1",
                article="Normans",
                question="Who were the Normans descended from?",
                answerable=True,
                answer="Norse raiders",
                evidence="descended from Norse raiders",
            ),
            OwnerRow(
                id="own-2",
                article="Normans",
                question="What did the Normans eat?",
                answerable=True,
                answer="bread",
                evidence="a quote that is not in the article",
            ),
            OwnerRow(
                id="own-3",
                article="Unknown_article",
                question="Who?",
                answerable=True,
                evidence="x",
            ),
            OwnerRow(
                id="own-4",
                article="Oxygen",
                question="Who won the 2018 FIFA World Cup?",
                answerable=False,
            ),
        ],
        compound=[
            CompoundRow(
                id="c1",
                question="When did the Normans conquer England, and who discovered oxygen?",
                articles=["Normans", "Oxygen"],
                answer="1066; Carl Wilhelm Scheele",
            ),
            CompoundRow(id="c2", question="Who discovered oxygen?", articles=[], answer="Scheele"),
        ],
    )


def evaluator(corpus_path: Path, **kw: Any) -> Evaluator:
    settings = fake_settings()
    providers = kw.pop("providers", build_providers(settings))
    judge = kw.pop("judge", FakeJudge())
    return Evaluator(
        settings, SqliteCorpusStore(corpus_path), providers, judge, log=lambda _: None, **kw
    )


async def test_a_full_fake_run(corpus_path: Path, squad_path: Path) -> None:
    ev = evaluator(corpus_path)
    results = await ev.run(golden_for(squad_path))

    assert results.run.illustrative and results.run.answer.provider == "fake"
    assert [(g.name, g.questions, g.answerable) for g in results.golden] == [
        ("squad_auto", 5, 3),
        ("owner", 4, 3),
        ("compound", 2, 2),
    ]
    # 3 squad questions + the one owner question whose evidence is in the article.
    assert results.retrieval.questions == 4
    assert len(results.retrieval.configs) == 3 * 3 * 2
    for config in results.retrieval.configs:
        assert config.errors == 0 and 0 <= config.mrr <= 1
        assert list(config.recall) == ["1", "3", "5", "10"]
        assert config.recall["1"] <= config.recall["10"]

    answers = results.answers
    assert answers.config.chunk_set == "medium" and answers.config.k == 5
    assert answers.answerable.questions == 6 and answers.unanswerable.questions == 3
    assert answers.answerable.evidence_in_context.of == 4  # rows without a gold span are skipped
    assert answers.unanswerable.abstained.count >= 1  # the FIFA question is not in the corpus
    assert answers.answerable.faithfulness is not None

    classic, agentic = results.compound
    assert (classic.pipeline, agentic.pipeline) == ("classic", "agentic")
    assert classic.mean_searches == 0 and agentic.mean_searches >= 1
    assert results.cost.total_usd == 0
    assert {line.model for line in results.cost.by_model} >= {"fake-extractive", "fake-judge"}
    assert {d["part"] for d in ev.details} == {"answers", "compound"}


class FailingEmbedder:
    provider, model, dims = "fake", "broken", 64

    async def embed(self, texts: list[str], input_type: InputType) -> Embeddings:
        raise RuntimeError("embedding service down")


class FailingJudge:
    provider, model = "fake", "fake-judge"

    async def call(self, system: str, prompt: str, tool: dict[str, Any]) -> ToolAnswer:
        raise RuntimeError("judge down")


async def test_failures_are_counted_not_hidden(corpus_path: Path, squad_path: Path) -> None:
    fake = build_providers(fake_settings())
    providers = Providers(FailingEmbedder(), fake.reranker, fake.answer)
    results = await evaluator(corpus_path, providers=providers).run(golden_for(squad_path))
    bm25 = [c for c in results.retrieval.configs if c.mode == "bm25"]
    vector = [c for c in results.retrieval.configs if c.mode == "vector"]
    assert all(c.errors == 0 for c in bm25)
    assert all(c.errors == c.questions + c.errors and c.questions == 0 for c in vector)
    # The default configuration is hybrid, so every answer run fails at the embedding.
    assert results.answers.answerable.errors == results.answers.answerable.questions
    assert all(c.errors == c.questions for c in results.compound)


async def test_judge_failures_are_errors(corpus_path: Path, squad_path: Path) -> None:
    results = await evaluator(corpus_path, judge=FailingJudge()).run(golden_for(squad_path))
    answerable = results.answers.answerable
    assert answerable.errors > 0
    assert results.compound[0].errors == 2


class SilentModel(FakeAnswerModel):
    """Answers with no text at all: nothing to grade."""

    async def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        yield FinalAnswer(blocks=[], stop_reason="end_turn", input_tokens=1, output_tokens=0)


async def test_empty_answers_are_not_graded(corpus_path: Path, squad_path: Path) -> None:
    fake = build_providers(fake_settings())
    providers = Providers(fake.embedder, fake.reranker, SilentModel())
    ev = evaluator(corpus_path, providers=providers)
    results = await ev.run(golden_for(squad_path))
    assert results.answers.answerable.faithfulness is None
    assert results.answers.answerable.fully_supported.of == 0
    assert results.answers.answerable.fully_supported.value is None


def test_read_outcome_without_a_done_event() -> None:
    outcome = read_outcome([], None)
    assert (outcome.status, outcome.ok, outcome.answer, outcome.ms) == ("unfinished", False, "", 0)


async def test_cached_embedder_charges_once() -> None:
    inner = build_providers(fake_settings()).embedder
    cached = CachedEmbedder(inner)
    first = await cached.embed(["hello"], "query")
    again = await cached.embed(["hello"], "query")
    assert first.tokens > 0 and again.tokens == 0
    assert (again.vectors == first.vectors).all()


def test_ledger_is_its_own_state_store() -> None:
    ledger = Ledger()
    ledger.record_run("r", "ip", "{}")
    ledger.finish_run("r", "ok", 1, 0.0)
    ledger.record_spend("r", "p", "m", "s", 10, 2, 0.5)
    ledger.record_spend("r", "p", "m", "s", 0, 0, 0.0)  # a cached call
    assert (ledger.month_spend(), ledger.runs_since("ip", 60), ledger.total()) == (0.0, 0, 0.5)
    (line,) = ledger.by_model()
    assert (line.calls, line.input_tokens, line.cost_usd) == (1, 10, 0.5)


@pytest.fixture(autouse=True)
def _no_network(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("VOYAGE_API_KEY", raising=False)
