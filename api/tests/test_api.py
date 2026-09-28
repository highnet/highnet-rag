import pytest
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
    assert client.get("/api/query", params={"q": "x", "mode": "agentic"}).status_code == 422


def by_stage(events) -> dict[str, dict]:
    return {d["stage"]: d for name, d in events if name == "trace"}


def test_bm25_mode_skips_the_embedding_and_shows_the_match_string(client: TestClient) -> None:
    t = by_stage(run(client, q="Where is Normandy located?", mode="bm25", k=2))
    for stage in ("embed_query", "map_project", "vector", "fuse"):
        assert t[stage]["status"] == "skipped", stage
    assert t["bm25"]["data"]["fts_query"] == '"normandy" OR "located"'
    terms = {x["term"]: x for x in t["bm25"]["data"]["terms"]}
    assert terms["normandy"]["chunks"] >= 1 and terms["normandy"]["idf"] > 0
    assert [w["term"] for w in t["bm25"]["data"]["words"]] == [None, None, "normandy", "located"]
    assert t["bm25"]["tokens"] == 0 and t["embed_query"]["cost_usd"] == 0
    context = t["select_context"]["data"]
    assert context["ranking"] == "bm25" and context["score_name"] == "bm25"
    assert [c["chunk_id"] for c in context["chunks"]] == [
        r["chunk_id"] for r in t["bm25"]["data"]["results"]
    ]
    assert "Normans" in t["bm25"]["data"]["results"][0]["doc_title"]


def test_vector_mode_skips_keyword_search_and_fusion(client: TestClient) -> None:
    t = by_stage(run(client, mode="vector", k=2))
    assert t["bm25"]["status"] == "skipped" and t["fuse"]["status"] == "skipped"
    assert t["vector"]["data"]["depth"] == 2
    assert t["select_context"]["data"]["score_name"] == "distance"


def test_hybrid_mode_fuses_deeper_lists_with_rrf(client: TestClient) -> None:
    t = by_stage(run(client, q="Where is Normandy?", mode="hybrid", k=2))
    assert t["bm25"]["data"]["depth"] == 4 and t["vector"]["data"]["depth"] == 4
    fuse = t["fuse"]["data"]
    assert fuse["method"] == "rrf" and fuse["k"] == 60 and fuse["kept"] == 2
    for row in fuse["results"]:
        ranks = [r for r in row["from"].values() if r is not None]
        assert row["score"] == pytest.approx(sum(1 / (60 + r) for r in ranks), abs=1e-5)
        assert set(row["from"]) == {"bm25_rank", "vector_rank"}
    context = t["select_context"]["data"]
    assert context["ranking"] == "fuse"
    assert [c["chunk_id"] for c in context["chunks"]] == [
        r["chunk_id"] for r in fuse["results"][:2]
    ]


def test_figures_get_real_numbers(client: TestClient) -> None:
    t = by_stage(run(client, q="Where is Normandy?", k=2))
    budget = t["request"]["data"]["budget"]
    assert budget["degrade_at_usd"] == budget["cap_usd"] * 0.8
    prompt = t["prompt"]["data"]
    assert prompt["context_window"] is None  # fake model: no documented window
    parts = prompt["parts_approx"]
    assert parts["passages"] == t["select_context"]["data"]["context_tokens_approx"]
    assert parts["system"] > 0 and parts["question"] > 0
    split = t["generate"]["data"]["cost_split"]
    assert split == {"input_usd": 0.0, "output_usd": 0.0}  # fake models are free


def test_rerank_reorders_deeper_candidates_and_records_the_moves(client: TestClient) -> None:
    t = by_stage(run(client, q="Where is Normandy?", mode="vector", k=2, rerank="true"))
    assert t["vector"]["data"]["depth"] == 4  # the reranker gets candidates beyond top-k
    rerank = t["rerank"]["data"]
    assert rerank["input"] == "vector" and rerank["kept"] == 2
    results = rerank["results"]
    assert sorted(r["before_rank"] for r in results) == list(range(1, len(results) + 1))
    assert [r["relevance"] for r in results] == sorted(
        (r["relevance"] for r in results), reverse=True
    )
    context = t["select_context"]["data"]
    assert context["ranking"] == "rerank" and context["score_name"] == "relevance"
    assert [c["chunk_id"] for c in context["chunks"]] == [r["chunk_id"] for r in results[:2]]
    assert t["request"]["data"]["settings"]["rerank"] is True


def test_rerank_is_off_by_default_and_paused_past_the_budget_mark(make_settings) -> None:
    settings = make_settings(budget_monthly_usd=1.0)
    with TestClient(create_app(settings)) as c:
        assert by_stage(run(c))["rerank"]["data"]["reason"].startswith("Off.")
        SqliteStateStore(settings.state_db_path).record_spend(None, "x", "m", "gen", 0, 0, 0.9)
        t = by_stage(run(c, rerank="true"))
    assert t["rerank"]["status"] == "skipped" and "80%" in t["rerank"]["data"]["reason"]


def test_changing_a_setting_changes_the_trace(client: TestClient) -> None:
    def retrieval(**params: str | int):
        t = by_stage(run(client, q="Where is Normandy?", **params))
        context = t["select_context"]["data"]
        return (context["ranking"], [c["chunk_id"] for c in context["chunks"]])

    base = retrieval(mode="hybrid", k=2, chunk_set="medium")
    assert retrieval(mode="bm25", k=2, chunk_set="medium")[0] != base[0]
    assert len(retrieval(mode="hybrid", k=1, chunk_set="medium")[1]) == 1
    assert set(retrieval(mode="hybrid", k=2, chunk_set="small")[1]).isdisjoint(base[1])


def test_config_map_and_chunk_endpoints(client: TestClient) -> None:
    config = client.get("/api/config").json()
    assert config["modes"] == ["bm25", "vector", "hybrid"] and config["illustrative"] is True
    assert config["default_mode"] == "hybrid"
    corpus_map = client.get("/api/corpus/map", params={"chunk_set": "medium"}).json()
    points = corpus_map["points"]
    assert corpus_map["documents"][str(points[0][1])] in {"Normans", "Amazon_rainforest", "Oxygen"}
    assert points
    chunk = client.get(f"/api/chunks/{points[0][0]}").json()
    assert chunk["id"] == points[0][0] and chunk["text"]
    assert client.get("/api/health").json()["ok"] is True
