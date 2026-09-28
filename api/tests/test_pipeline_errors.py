"""Every failure path still ends in a trace event and a `done` event (rule zero)."""

from collections.abc import AsyncIterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from highnet_rag.app import create_app
from highnet_rag.config import Settings
from highnet_rag.providers import build_providers
from highnet_rag.providers.base import AnswerBlock, Citation, FinalAnswer
from highnet_rag.providers.fake import FakeAnswerModel
from highnet_rag.storage.sqlite import SqliteCorpusStore

from .conftest import parse_sse


def run(client: TestClient, **params: str | int) -> list[tuple[str, dict]]:
    return parse_sse(client.get("/api/query", params={"q": "Where is Normandy?", **params}).text)


def traces(events: list[tuple[str, dict]]) -> dict[str, dict]:
    return {d["stage"]: d for name, d in events if name == "trace"}


class BrokenCorpus(SqliteCorpusStore):
    def __init__(self, path, *, broken: str) -> None:
        super().__init__(path)
        self.broken = broken

    def projection(self, chunk_set_id: int):
        if self.broken == "projection":
            raise LookupError("no PCA for this chunk set")
        return super().projection(chunk_set_id)

    def bm25(self, fts_query: str, chunk_set_id: int, k: int):
        if self.broken == "bm25":
            raise RuntimeError("fts5: syntax error")
        return super().bm25(fts_query, chunk_set_id, k)

    def knn(self, vector, chunk_set_id: int, k: int):
        if self.broken == "knn":
            raise RuntimeError("vector index unavailable")
        return super().knn(vector, chunk_set_id, k)


class ScriptedAnswer(FakeAnswerModel):
    """A fake answer model that fails, or answers, in a scripted way."""

    def __init__(self, mode: str) -> None:
        self.mode = mode

    async def count_tokens(self, system: str, messages: list[dict[str, Any]]) -> int:
        if self.mode == "count_fails":
            raise RuntimeError("token counting failed")
        return 10

    async def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        if self.mode == "stream_fails":
            yield "partial "
            raise RuntimeError("stream dropped")
        if self.mode == "no_final":
            yield "text only"
            return
        blocks = [
            AnswerBlock(text="Uncited claim. "),
            AnswerBlock(text="Bad index.", citations=[Citation(document_index=99, cited_text="x")]),
        ]
        yield FinalAnswer(blocks=blocks, stop_reason="max_tokens", input_tokens=10, output_tokens=5)


def app_with(settings: Settings, *, corpus=None, answer=None, reranker=None) -> TestClient:
    providers = build_providers(settings)
    if answer is not None:
        providers.answer = answer
    if reranker is not None:
        providers.reranker = reranker
    return TestClient(create_app(settings, providers=providers, corpus=corpus))


def test_unknown_chunk_set_is_refused_in_the_request_stage(client: TestClient) -> None:
    events = run(client, chunk_set="nope")
    assert events[0][1]["data"]["error"]["type"] == "unknown_chunk_set"
    assert events[-1][1]["status"] == "error"


def test_map_failure_is_a_warning_and_the_run_continues(make_settings, corpus_path) -> None:
    with app_with(make_settings(), corpus=BrokenCorpus(corpus_path, broken="projection")) as c:
        events = run(c)
    t = traces(events)
    assert t["map_project"]["status"] == "warning"
    assert "no PCA" in t["map_project"]["data"]["error"]["message"]
    assert events[-1][1]["status"] == "ok"


@pytest.mark.parametrize(("broken", "stage"), [("knn", "vector"), ("bm25", "bm25")])
def test_search_failure_stops_the_run(make_settings, corpus_path, broken, stage) -> None:
    with app_with(make_settings(), corpus=BrokenCorpus(corpus_path, broken=broken)) as c:
        events = run(c)
    assert traces(events)[stage]["status"] == "error"
    assert events[-1][1]["status"] == "error"


@pytest.mark.parametrize(
    ("mode", "stage", "message"),
    [
        ("count_fails", "prompt", "token counting failed"),
        ("stream_fails", "generate", "stream dropped"),
        ("no_final", "generate", "without a final message"),
    ],
)
def test_model_failures_become_error_events(make_settings, mode, stage, message) -> None:
    with app_with(make_settings(), answer=ScriptedAnswer(mode)) as c:
        events = run(c)
    t = traces(events)
    assert t[stage]["status"] == "error"
    assert message in t[stage]["data"]["error"]["message"]
    assert events[-1][1]["status"] == "error"


def test_truncated_answer_and_bad_citations_are_flagged(make_settings) -> None:
    with app_with(make_settings(), answer=ScriptedAnswer("odd_answer")) as c:
        events = run(c)
    t = traces(events)
    assert t["generate"]["status"] == "warning"  # stop_reason max_tokens
    assert t["citations"]["status"] == "warning"  # nothing valid was cited
    assert t["citations"]["data"]["citations"] == []


def test_empty_retrieval_is_a_warning(make_settings, corpus_path) -> None:
    class EmptyCorpus(SqliteCorpusStore):
        def knn(self, vector, chunk_set_id: int, k: int):
            return []

    with app_with(make_settings(), corpus=EmptyCorpus(corpus_path)) as c:
        events = run(c)
    assert traces(events)["vector"]["status"] == "warning"


def test_nothing_found_by_either_search_is_a_warning_at_each_step(
    make_settings, corpus_path
) -> None:
    class EmptyCorpus(SqliteCorpusStore):
        def knn(self, vector, chunk_set_id: int, k: int):
            return []

    with app_with(make_settings(), corpus=EmptyCorpus(corpus_path)) as c:
        # Only stop words: there is nothing for BM25 to match, so no MATCH string at all.
        events = run(c, q="What is the?")
    t = traces(events)
    assert t["bm25"]["status"] == "warning" and t["bm25"]["data"]["fts_query"] == ""
    assert t["fuse"]["status"] == "warning" and t["fuse"]["data"]["results"] == []
    assert t["select_context"]["data"]["chunks"] == []


def test_a_failed_rerank_keeps_the_previous_order_and_says_so(make_settings) -> None:
    class BrokenReranker:
        provider = "fake"
        model = "fake-broken"

        async def rerank(self, query: str, documents: list[str], top_k: int):
            raise RuntimeError("reranker timed out")

    with app_with(make_settings(), reranker=BrokenReranker()) as c:
        events = run(c, rerank="true", k=2)
    t = traces(events)
    assert t["rerank"]["status"] == "warning"
    assert t["rerank"]["data"]["fallback"] == "Kept the fuse order."
    assert t["select_context"]["data"]["ranking"] == "fuse"
    assert events[-1][1]["status"] == "ok"


def test_rerank_is_skipped_when_there_is_nothing_to_rerank(make_settings, corpus_path) -> None:
    class EmptyCorpus(SqliteCorpusStore):
        def knn(self, vector, chunk_set_id: int, k: int):
            return []

    with app_with(make_settings(), corpus=EmptyCorpus(corpus_path)) as c:
        events = run(c, q="What is the?", rerank="true")
    assert traces(events)["rerank"]["data"]["reason"] == "No candidates to rerank."
