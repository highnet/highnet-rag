"""Pre-recorded demo questions: the recorder, the store, the caches and replay over the API."""

import asyncio
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from highnet_rag.app import create_app
from highnet_rag.pipeline.deps import Deps, QueryParams
from highnet_rag.providers import build_providers
from highnet_rag.providers.base import FinalAnswer
from highnet_rag.providers.cache import CachedAnswerModel
from highnet_rag.providers.fake import FakeAnswerModel
from highnet_rag.recordings import RecorderState, combo_key, grid, record, replay_note
from highnet_rag.storage.base import DemoQuestion, Recording
from highnet_rag.storage.sqlite import SqliteCorpusStore, SqliteRecordingStore

from .conftest import parse_sse

QUESTIONS = [
    DemoQuestion("normandy", "In what country is Normandy located?", False),
    DemoQuestion("two", "Where is Normandy, and who discovered oxygen?", True),
]


def recorded(make_settings, path: Path, questions=QUESTIONS) -> tuple[Any, Any]:
    settings = make_settings(recordings_db_path=path)
    deps = Deps(
        settings,
        SqliteCorpusStore(settings.corpus_db_path),
        RecorderState(),
        build_providers(settings),
    )
    store = SqliteRecordingStore(path)
    report = asyncio.run(record(questions, deps, store, log=lambda _: None, concurrency=2))
    return store, report


def test_grid_covers_every_setting_and_the_agent_only_for_compound_questions() -> None:
    sets = ["small", "medium"]
    single, compound = grid(QUESTIONS[0], sets), grid(QUESTIONS[1], sets)
    assert len(single) == 3 * 3 * 2 * 2 and len(compound) == 2 * len(single)
    assert not any(p.agentic for p in single)
    assert {p.k for p in single} == {3, 5, 10}
    assert len({combo_key(p) for p in compound}) == len(compound)


def test_record_is_resumable_and_reports_its_cost(make_settings, tmp_path: Path) -> None:
    path = tmp_path / "rec.sqlite"
    store, report = recorded(make_settings, path)
    assert report.recorded == 36 + 72 and not report.failed and report.cost_usd == 0
    assert [q.id for q in store.questions()] == ["normandy", "two"]
    assert store.recorded_at() is not None
    assert len(store.combos("two")) == 72
    _, again = recorded(make_settings, path)
    assert (again.recorded, again.skipped) == (0, 108)


def test_failed_runs_are_reported_and_not_saved(make_settings, tmp_path: Path) -> None:
    class Broken(FakeAnswerModel):
        async def stream_answer(self, system, messages, max_tokens):  # type: ignore[override]
            raise RuntimeError("model down")
            yield ""

    settings = make_settings()
    providers = build_providers(settings)
    providers.answer = Broken()
    deps = Deps(settings, SqliteCorpusStore(settings.corpus_db_path), RecorderState(), providers)
    store = SqliteRecordingStore(tmp_path / "rec.sqlite")
    report = asyncio.run(record([DemoQuestion("y", "q", False)], deps, store, log=lambda _: None))
    assert report.recorded == 0 and len(report.failed) == 36
    assert store.combos("y") == set()


class Counting(FakeAnswerModel):
    def __init__(self) -> None:
        self.calls = 0

    async def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        self.calls += 1
        async for part in super().stream_answer(system, messages, max_tokens):
            yield part


async def test_answer_cache_replays_identical_calls() -> None:
    inner = Counting()
    cache = CachedAnswerModel(inner)
    assert (cache.provider, cache.model) == ("fake", "fake-extractive")
    messages = [{"role": "user", "content": [{"type": "text", "text": "Normandy?"}]}]
    first = [p async for p in cache.stream_answer("s", messages, 10)]
    second = [p async for p in cache.stream_answer("s", messages, 10)]
    assert first == second and inner.calls == 1 and len(cache.misses) == 1
    assert await cache.count_tokens("s", messages) == await cache.count_tokens("s", messages)
    tools = [{"name": "search"}]
    agent = [{"role": "user", "content": "Question: Where is Normandy, and who is Rollo?"}]
    turn = await cache.agent_turn("s", agent, tools, 100)
    assert await cache.agent_turn("s", agent, tools, 100) is turn and len(cache.misses) == 2


async def test_answer_cache_requires_a_final_message() -> None:
    class NoFinal(FakeAnswerModel):
        async def stream_answer(self, system, messages, max_tokens):  # type: ignore[override]
            yield "text only"

    cache = CachedAnswerModel(NoFinal())
    with pytest.raises(RuntimeError, match="without a final"):
        [p async for p in cache.stream_answer("s", [], 10)]


def test_store_round_trip(tmp_path: Path) -> None:
    store = SqliteRecordingStore(tmp_path / "r.sqlite")
    assert store.questions() == [] and store.recorded_at() is None
    store.save_questions(QUESTIONS)
    store.save_questions([DemoQuestion("normandy", "Changed?", False)])
    assert store.questions()[0].question == "Changed?"
    item = {"type": "done", "at_ms": 0, "data": {}}
    store.save(Recording("normandy", "k", "2026-09-28T00:00:00+00:00", [item]))
    assert store.load("normandy", "k") == Recording(
        "normandy", "k", "2026-09-28T00:00:00+00:00", [item]
    )
    assert store.load("normandy", "missing") is None


def replay_client(make_settings, path: Path, **overrides: Any) -> TestClient:
    return TestClient(
        create_app(
            make_settings(
                live_queries=False, recordings_db_path=path, replay_speed=1000, **overrides
            )
        )
    )


def test_replay_streams_the_recording_after_a_live_request_check(
    make_settings, tmp_path: Path
) -> None:
    path = tmp_path / "rec.sqlite"
    recorded(make_settings, path)
    with replay_client(make_settings, path) as client:
        config = client.get("/api/config").json()
        assert config["live"] is False and config["recorded"]["ks"] == [3, 5, 10]
        assert [q["id"] for q in config["questions"]] == ["normandy", "two"]
        body = client.get(
            "/api/query", params={"question_id": "normandy", "mode": "bm25", "k": 3}
        ).text
        events = parse_sse(body)
        request = events[0][1]
        assert request["stage"] == "request" and request["seq"] == 1
        assert request["data"]["recording"]["recorded_at"]
        assert "offline stand-ins" in request["data"]["recording"]["note"]
        run_ids = {data["run_id"] for _, data in events}
        assert len(run_ids) == 1 and request["data"]["run_id"] in run_ids
        assert {name for name, _ in events} == {"trace", "answer_delta", "done"}
        assert events[-1][1]["status"] == "ok"
        agentic = parse_sse(
            client.get("/api/query", params={"question_id": "two", "agentic": "true", "k": 5}).text
        )
        assert any(d.get("stage") == "agent_plan" for _, d in agentic)


def test_replay_refusals(make_settings, tmp_path: Path) -> None:
    path = tmp_path / "rec.sqlite"
    recorded(make_settings, path, QUESTIONS[:1])
    with replay_client(make_settings, path) as client:
        assert client.get("/api/query", params={"question_id": "nope"}).status_code == 404
        assert (
            client.get("/api/query", params={"question_id": "normandy", "k": 4}).status_code == 404
        )
        assert client.get("/api/query", params={"q": "free text"}).status_code == 404
    with replay_client(make_settings, path, rate_limit_per_min=1) as client:
        client.get("/api/query", params={"question_id": "normandy"})
        limited = parse_sse(client.get("/api/query", params={"question_id": "normandy"}).text)
        assert limited[0][1]["data"]["error"]["type"] == "rate_limited"
        assert limited[-1][1]["status"] == "limited"
    # Without a recordings file the list is empty and every pick is refused.
    with replay_client(make_settings, tmp_path / "none.sqlite") as client:
        assert client.get("/api/config").json()["questions"] == []
        assert client.get("/api/query", params={"question_id": "normandy"}).status_code == 404


def test_live_mode_needs_a_question(client: TestClient) -> None:
    assert client.get("/api/query").status_code == 422


def test_params_key_is_stable() -> None:
    params = QueryParams(q="x", mode="bm25", k=3, chunk_set="small", rerank=True)
    assert combo_key(params) == "bm25|3|small|1|0"


def test_replay_note_names_the_recorded_models() -> None:
    def data(provider: str, model: str) -> dict[str, Any]:
        return {
            "models": {
                "embed": {"provider": "voyage", "model": "voyage-3.5-lite"},
                "answer": {"provider": provider, "model": model},
            }
        }

    real = replay_note(data("anthropic", "claude-haiku-4-5"))
    assert "real models (voyage-3.5-lite, claude-haiku-4-5)" in real
    assert "offline stand-ins" in replay_note(data("fake", "fake-extractive"))
