import json
from pathlib import Path

from fastapi.testclient import TestClient

from highnet_rag.app import create_app
from highnet_rag.budget import budget_state
from highnet_rag.storage.sqlite import SqliteStateStore

from .test_pipeline_errors import ScriptedAnswer, app_with


def test_missing_corpus_reports_unhealthy_and_503(make_settings, tmp_path: Path) -> None:
    with TestClient(create_app(make_settings(corpus_db_path=tmp_path / "missing.sqlite"))) as c:
        health = c.get("/api/health").json()
        assert health["ok"] is False and "highnet-rag ingest" in health["error"]
        response = c.get("/api/config")
    assert response.status_code == 503


def test_not_found_endpoints(client: TestClient, make_settings, tmp_path: Path) -> None:
    assert client.get("/api/corpus/map", params={"chunk_set": "nope"}).status_code == 404
    assert client.get("/api/chunks/999999").status_code == 404
    unpublished = make_settings(evals_results_path=tmp_path / "none.json")
    with TestClient(create_app(unpublished)) as c:
        assert c.get("/api/evals").status_code == 404


def test_evals_results_are_served_when_published(make_settings, tmp_path: Path) -> None:
    results = tmp_path / "latest.json"
    results.write_text(json.dumps({"recall_at_5": 0.9}), encoding="utf-8")
    with TestClient(create_app(make_settings(evals_results_path=results))) as c:
        assert c.get("/api/evals").json() == {"recall_at_5": 0.9}


def test_static_export_is_served_from_the_same_origin(make_settings, tmp_path: Path) -> None:
    static = tmp_path / "out"
    static.mkdir()
    (static / "index.html").write_text("<h1>pad</h1>", encoding="utf-8")
    with TestClient(create_app(make_settings(static_dir=static))) as c:
        assert c.get("/").text == "<h1>pad</h1>"


def test_keepalive_comments_are_sent_while_a_stage_is_slow(make_settings) -> None:
    class SlowAnswer(ScriptedAnswer):
        async def count_tokens(self, system, messages) -> int:
            import asyncio

            await asyncio.sleep(0.05)
            return 10

    with app_with(make_settings(sse_keepalive_seconds=0.01), answer=SlowAnswer("ok")) as c:
        body = c.get("/api/query", params={"q": "Normandy"}).text
    assert ": keep-alive" in body


def test_budget_degrades_at_the_threshold(make_settings) -> None:
    settings = make_settings(budget_monthly_usd=10.0, budget_degrade_at=0.8)
    state = SqliteStateStore(settings.state_db_path)
    assert budget_state(state, settings).tier == "normal"
    state.record_spend(None, "anthropic", "claude-haiku-4-5", "generate", 1, 1, 8.5)
    budget = budget_state(state, settings)
    assert budget.tier == "degraded" and budget.as_dict()["remaining_usd"] == 1.5
