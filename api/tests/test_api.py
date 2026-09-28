from fastapi.testclient import TestClient

from highnet_rag.app import create_app
from highnet_rag.storage.sqlite import SqliteStateStore

from .conftest import parse_sse

STAGES = [
    "request",
    "embed_query",
    "map_project",
    "bm25",
    "vector",
    "fuse",
    "rerank",
    "select_context",
    "prompt",
    "generate",
    "citations",
]


def run(client: TestClient, q: str = "Where is Normandy?", **params: str | int):
    response = client.get("/api/query", params={"q": q, **params})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["x-accel-buffering"] == "no"
    return parse_sse(response.text)


def test_every_stage_emits_exactly_one_trace_event_in_order(client: TestClient) -> None:
    events = run(client, k=2)
    traces = [d for name, d in events if name == "trace"]
    assert [t["stage"] for t in traces] == STAGES
    assert [t["seq"] for t in traces] == list(range(1, len(STAGES) + 1))
    for t in traces:
        assert set(t) >= {"stage", "data", "ms", "tokens", "cost_usd", "status", "run_id"}
        if t["status"] == "skipped":
            assert t["data"]["reason"]
    assert traces[1]["data"]["retries"] == 0
    name, done = events[-1]
    assert name == "done" and done["status"] == "ok" and done["stages"] == len(STAGES)
    assert done["tokens"] == sum(t["tokens"] for t in traces)


def test_answer_streams_and_cites_retrieved_chunks(client: TestClient) -> None:
    events = run(client, q="Which country is Normandy in?", k=2)
    streamed = "".join(d["text"] for name, d in events if name == "answer_delta")
    traces = {d["stage"]: d for name, d in events if name == "trace"}
    assert streamed == traces["generate"]["data"]["answer"]
    context_ids = {c["chunk_id"] for c in traces["select_context"]["data"]["chunks"]}
    cited = traces["citations"]["data"]["citations"]
    assert cited and {c["chunk_id"] for c in cited} <= context_ids
    assert "France" in streamed


def test_prompt_stage_exposes_the_exact_request(client: TestClient) -> None:
    traces = {d["stage"]: d for name, d in run(client) if name == "trace"}
    prompt = traces["prompt"]["data"]
    assert prompt["system"] and prompt["messages"][0]["role"] == "user"
    docs = [b for b in prompt["messages"][0]["content"] if b["type"] == "document"]
    assert len(docs) == len(traces["select_context"]["data"]["chunks"])


def test_rate_limit_is_enforced_and_visible(make_settings) -> None:
    with TestClient(create_app(make_settings(rate_limit_per_min=2))) as c:
        run(c)
        run(c)
        events = run(c)
    request = events[0][1]
    assert request["stage"] == "request" and request["status"] == "error"
    assert request["data"]["error"]["type"] == "rate_limited"
    assert events[-1] == ("done", events[-1][1]) and events[-1][1]["status"] == "limited"
    assert len(events) == 2


def test_budget_hard_stop(make_settings) -> None:
    settings = make_settings(budget_monthly_usd=1.0)
    SqliteStateStore(settings.state_db_path).record_spend(None, "x", "m", "generate", 0, 0, 1.0)
    with TestClient(create_app(settings)) as c:
        events = run(c)
    assert events[0][1]["data"]["error"]["type"] == "budget_exhausted"
    assert events[0][1]["data"]["budget"]["tier"] == "stopped"
    assert events[-1][1]["status"] == "limited"


def test_budget_guard_refuses_call_that_could_overspend(make_settings) -> None:
    settings = make_settings(
        budget_monthly_usd=1.0,
        price_overrides={"fake-extractive": {"input": 0, "output": 2_000_000}},
    )
    with TestClient(create_app(settings)) as c:
        events = run(c)
    traces = {d["stage"]: d for name, d in events if name == "trace"}
    assert traces["prompt"]["status"] == "error"
    assert traces["prompt"]["data"]["error"]["type"] == "budget_guard"
    assert "generate" not in traces


def test_missing_api_key_fails_as_a_trace_event_not_a_crash(make_settings) -> None:
    with TestClient(create_app(make_settings(fake_providers=False))) as c:
        events = run(c)
    traces = [d for name, d in events if name == "trace"]
    assert traces[-1]["stage"] == "embed_query" and traces[-1]["status"] == "error"
    assert "VOYAGE_API_KEY" in traces[-1]["data"]["error"]["message"]
    assert events[-1][1]["status"] == "error"


def test_unsupported_mode_is_rejected(client: TestClient) -> None:
    assert client.get("/api/query", params={"q": "x", "mode": "hybrid"}).status_code == 422


def test_config_map_and_chunk_endpoints(client: TestClient) -> None:
    config = client.get("/api/config").json()
    assert config["modes"] == ["vector"] and config["illustrative"] is True
    points = client.get("/api/corpus/map", params={"chunk_set": "medium"}).json()["points"]
    assert points
    chunk = client.get(f"/api/chunks/{points[0][0]}").json()
    assert chunk["id"] == points[0][0] and chunk["text"]
    assert client.get("/api/health").json()["ok"] is True
