import io
import json
import sys
from pathlib import Path

import pytest

from highnet_rag import cli
from highnet_rag.config import get_settings
from highnet_rag.storage.sqlite import SqliteCorpusStore

from .conftest import SQUAD_FIXTURE


def run_cli(monkeypatch: pytest.MonkeyPatch, *args: str) -> None:
    monkeypatch.setattr(sys, "argv", ["highnet-rag", *args])
    cli.main()


def test_fetch_squad_downloads_to_the_given_path(monkeypatch, tmp_path: Path, capsys) -> None:
    payload = json.dumps(SQUAD_FIXTURE).encode()
    monkeypatch.setattr(cli.urllib.request, "urlopen", lambda url, timeout: io.BytesIO(payload))
    out = tmp_path / "squad" / "dev.json"
    run_cli(monkeypatch, "fetch-squad", "--out", str(out))
    assert out.read_bytes() == payload
    assert "Saved" in capsys.readouterr().out


def test_ingest_fake_builds_a_corpus_and_reports_cost(
    monkeypatch, tmp_path: Path, squad_path: Path, capsys
) -> None:
    monkeypatch.setenv("EMBED_DIMS", "32")
    get_settings.cache_clear()
    out = tmp_path / "corpus.sqlite"
    run_cli(
        monkeypatch,
        *("ingest", "--fake", "--limit", "2", "--batch-size", "4", "--chunk-sets", "small, medium"),
        *("--source", str(squad_path), "--out", str(out)),
    )
    get_settings.cache_clear()
    store = SqliteCorpusStore(out)
    assert [s.name for s in store.chunk_sets()] == ["small", "medium"]
    assert store.meta()["embed_provider"] == "fake"
    printed = capsys.readouterr().out
    assert "from 2 articles" in printed and "total embedding cost: $0.0000" in printed


def test_ingest_uses_fake_providers_from_settings(monkeypatch, tmp_path: Path, squad_path) -> None:
    monkeypatch.setenv("FAKE_PROVIDERS", "true")
    monkeypatch.setenv("EMBED_DIMS", "32")
    get_settings.cache_clear()
    out = tmp_path / "corpus.sqlite"
    run_cli(monkeypatch, "ingest", "--source", str(squad_path), "--out", str(out))
    get_settings.cache_clear()
    assert [s.name for s in SqliteCorpusStore(out).chunk_sets()] == ["small", "medium", "large"]


def test_ingest_rejects_unknown_chunk_sets(monkeypatch, tmp_path: Path, squad_path: Path) -> None:
    with pytest.raises(ValueError, match="Unknown chunk sets"):
        run_cli(
            monkeypatch,
            *("ingest", "--fake", "--chunk-sets", "huge"),
            *("--source", str(squad_path), "--out", str(tmp_path / "c.sqlite")),
        )


def test_schema_exports_trace_models(monkeypatch, tmp_path: Path) -> None:
    out = tmp_path / "schema.json"
    run_cli(monkeypatch, "schema", "--out", str(out))
    defs = json.loads(out.read_text())["$defs"]
    assert {"TraceEvent", "AnswerDelta", "RunDone"} <= set(defs)
    assert "tokens" in defs["TraceEvent"]["required"]


def test_serve_runs_uvicorn(monkeypatch) -> None:
    calls: list[tuple] = []
    monkeypatch.setattr("uvicorn.run", lambda *a, **k: calls.append((a, k)))
    run_cli(monkeypatch, "serve", "--port", "9999")
    assert calls == [
        (("highnet_rag.app:app",), {"host": "127.0.0.1", "port": 9999, "reload": False})
    ]
