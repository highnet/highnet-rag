"""The agentic loop: planning, nested searches, caps and failures, all visible in the trace."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from highnet_rag.app import create_app
from highnet_rag.providers import build_providers
from highnet_rag.providers.base import AgentTurn, ToolCall
from highnet_rag.providers.fake import FakeAnswerModel
from highnet_rag.storage.sqlite import SqliteCorpusStore, SqliteStateStore

from .conftest import parse_sse

QUESTION = "Where is Normandy, and who discovered oxygen?"


def run(client: TestClient, q: str = QUESTION, **params: str | int) -> list[tuple[str, dict]]:
    response = client.get("/api/query", params={"q": q, "agentic": "true", "k": 2, **params})
    return parse_sse(response.text)


def traces(events) -> list[dict]:
    return [d for name, d in events if name == "trace"]


def app_with(settings, *, answer=None, corpus=None) -> TestClient:
    providers = build_providers(settings)
    if answer is not None:
        providers.answer = answer
    return TestClient(create_app(settings, providers=providers, corpus=corpus))


def turn(text: str, *calls: tuple[str, dict[str, Any]], stop: str = "tool_use") -> AgentTurn:
    tool_calls = [ToolCall(f"c{i}", name, args) for i, (name, args) in enumerate(calls)]
    return AgentTurn(
        text=text,
        calls=tool_calls,
        stop_reason=stop,
        input_tokens=50,
        output_tokens=10,
        content=[{"type": "text", "text": text}],
    )


class ScriptedAgent(FakeAnswerModel):
    """Plays back a fixed list of agent turns; can also fail on cue."""

    def __init__(self, turns: list[AgentTurn], *, fail: str | None = None) -> None:
        self.turns = turns
        self.fail = fail

    async def count_tokens(self, system, messages, tools=None) -> int:
        if tools is not None and self.fail == "count":
            raise RuntimeError("token counting failed")
        return await super().count_tokens(system, messages, tools)

    async def agent_turn(self, system, messages, tools, max_tokens) -> AgentTurn:
        if self.fail == "turn":
            raise RuntimeError("model overloaded")
        return self.turns.pop(0)


def test_the_agent_plans_searches_each_part_and_answers_from_both(client: TestClient) -> None:
    events = run(client)
    t = traces(events)
    stages = [e["stage"] for e in t]
    assert stages[:2] == ["request", "agent_plan"]
    assert stages[-4:] == ["select_context", "prompt", "generate", "citations"]
    plan = t[1]["data"]
    assert plan["queries"] == ["Where is Normandy", "who discovered oxygen"]
    assert plan["caps"] == {"max_steps": 4, "token_cap": 30000}
    steps = [e for e in t if e["stage"] == "agent_step"]
    assert [(s["label"], s["data"]["tool"]) for s in steps] == [
        ("3a", "search"),
        ("3b", "search"),
        ("3c", "answer"),
    ]
    # Each search runs the whole retrieval pass nested under its step, without the map.
    nested = [e for e in t if e["parent"] == "3a"]
    assert [e["stage"] for e in nested] == ["embed_query", "bm25", "vector", "fuse", "rerank"]
    assert [e["label"] for e in nested] == ["3a.1", "3a.2", "3a.3", "3a.4", "3a.5"]
    context = next(e for e in t if e["stage"] == "select_context")
    assert context["label"] == "4" and context["data"]["ranking"] == "agent"
    titles = {c["doc_title"] for c in context["data"]["chunks"]}
    assert {"Normans", "Oxygen"} <= titles
    assert [e["label"] for e in t if e["stage"] in ("prompt", "generate", "citations")] == [
        "5",
        "6",
        "7",
    ]
    assert t[0]["data"]["settings"]["agentic"] is True
    assert events[-1][1]["status"] == "ok"


def test_agentic_mode_is_paused_past_the_budget_mark(make_settings) -> None:
    settings = make_settings(budget_monthly_usd=1.0)
    SqliteStateStore(settings.state_db_path).record_spend(None, "x", "m", "gen", 0, 0, 0.9)
    with TestClient(create_app(settings)) as c:
        t = traces(run(c))
    assert t[1]["stage"] == "agent_plan" and t[1]["status"] == "skipped"
    assert "80%" in t[1]["data"]["reason"]
    assert [e["stage"] for e in t][2:4] == ["embed_query", "map_project"]


def test_the_search_limit_stops_the_loop_and_says_so(make_settings) -> None:
    searching = [turn("Searching.", ("search", {"query": f"Normandy {i}"})) for i in range(6)]
    with app_with(make_settings(agent_max_steps=2), answer=ScriptedAgent(searching)) as c:
        t = traces(run(c))
    steps = [e for e in t if e["stage"] == "agent_step"]
    assert [s["data"]["tool"] for s in steps] == ["search", "search", "stop"]
    assert steps[-1]["status"] == "warning"
    assert steps[-1]["data"]["stopped"] == "Reached the limit of 2 searches."


def test_bad_tool_calls_are_warnings_and_turns_without_tools_are_still_charged(
    make_settings,
) -> None:
    script = [
        turn("Plan.", ("lookup", {"x": 1}), ("search", {"query": "  "})),
        turn("Thinking it over.", stop="end_turn"),
    ]
    with app_with(make_settings(), answer=ScriptedAgent(script)) as c:
        t = traces(run(c))
    steps = [e for e in t if e["stage"] == "agent_step"]
    assert [(s["data"]["tool"], s["status"]) for s in steps] == [
        ("lookup", "warning"),
        ("search", "warning"),
        ("none", "ok"),
    ]
    assert steps[0]["data"]["error"]["message"] == "Unknown tool 'lookup'."
    assert steps[1]["data"]["error"]["message"] == "Empty query."
    assert steps[2]["tokens"] == 60  # the second turn's tokens are on its own step
    assert next(e for e in t if e["stage"] == "select_context")["data"]["chunks"] == []


def test_a_failed_search_is_reported_to_the_model_and_the_loop_goes_on(
    make_settings, corpus_path
) -> None:
    class BrokenBm25(SqliteCorpusStore):
        def bm25(self, fts_query: str, chunk_set_id: int, k: int):
            raise RuntimeError("fts5 unavailable")

    script = [
        turn("Plan.", ("search", {"query": "Normandy"})),
        turn("Enough.", ("answer", {})),
    ]
    agent = ScriptedAgent(script)
    with app_with(make_settings(), answer=agent, corpus=BrokenBm25(corpus_path)) as c:
        t = traces(run(c))
    assert next(e for e in t if e["parent"] == "3a" and e["stage"] == "bm25")["status"] == "error"
    assert [e["data"]["tool"] for e in t if e["stage"] == "agent_step"] == ["search", "answer"]


def test_a_model_that_never_finishes_runs_out_of_turns(make_settings) -> None:
    looping = [turn("Hmm.", ("lookup", {})) for _ in range(3)]
    with app_with(make_settings(agent_max_steps=1), answer=ScriptedAgent(looping)) as c:
        t = traces(run(c))
    stop = [e for e in t if e["stage"] == "agent_step"][-1]
    assert stop["data"]["stopped"] == "Reached the limit of 3 model turns."


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"agent_token_cap": 10}, "10-token cap"),
        (
            {
                "budget_monthly_usd": 0.0000001,
                "price_overrides": {"fake-extractive": {"input": 1e6}},
            },
            "budget",
        ),
    ],
)
def test_the_caps_stop_the_loop_before_an_expensive_turn(make_settings, overrides, message) -> None:
    with app_with(make_settings(**overrides)) as c:
        t = traces(run(c))
    stop = next(e for e in t if e["stage"] == "agent_step")
    assert stop["data"]["tool"] == "stop" and message in stop["data"]["stopped"]


@pytest.mark.parametrize("fail", ["count", "turn"])
def test_model_failures_end_the_run_with_an_error_event(make_settings, fail) -> None:
    with app_with(make_settings(), answer=ScriptedAgent([], fail=fail)) as c:
        events = run(c)
    t = traces(events)
    assert t[-1]["stage"] == "agent_plan" and t[-1]["status"] == "error"
    assert events[-1][1]["status"] == "error"
