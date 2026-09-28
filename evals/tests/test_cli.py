import json
import shutil
import sys
from pathlib import Path

import pytest

from highnet_rag.config import get_settings
from highnet_rag_evals import cli
from highnet_rag_evals.golden import CompoundRow, write_jsonl


def run_cli(monkeypatch: pytest.MonkeyPatch, *args: str) -> None:
    monkeypatch.setattr(sys, "argv", ["highnet-rag-evals", *args])
    get_settings.cache_clear()
    cli.main()
    get_settings.cache_clear()


def test_build_golden_run_and_schema(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    squad_path: Path,
    corpus_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("EMBED_DIMS", "64")
    golden = tmp_path / "golden"
    run_cli(monkeypatch, "build-golden", "--source", str(squad_path), "--out", str(golden))
    assert "5 questions (3 answerable)" in capsys.readouterr().out
    write_jsonl(
        golden / "compound.jsonl",
        [CompoundRow(id="c", question="Who discovered oxygen?", articles=["Oxygen"], answer="x")],
    )

    out = tmp_path / "results"
    run_cli(
        monkeypatch,
        *("run", "--fake", "--golden", str(golden), "--corpus", str(corpus_path)),
        *("--out", str(out), "--limit", "2", "--concurrency", "2"),
    )
    printed = capsys.readouterr().out
    assert "eval run cost: $0.0000" in printed
    latest = json.loads((out / "latest.json").read_text(encoding="utf-8"))
    assert latest["golden"][0]["questions"] == 2 and latest["run"]["illustrative"] is True
    dated = [p.name for p in out.iterdir()]
    assert any(n.endswith(".details.jsonl") for n in dated) and len(dated) == 3

    # Without flags the run reads CORPUS_DB_PATH and FAKE_PROVIDERS, and takes every row.
    local = tmp_path / "corpus.sqlite"
    shutil.copy(corpus_path, local)
    monkeypatch.setenv("CORPUS_DB_PATH", str(local))
    monkeypatch.setenv("FAKE_PROVIDERS", "true")
    run_cli(monkeypatch, "run", "--golden", str(golden), "--out", str(out))
    latest = json.loads((out / "latest.json").read_text(encoding="utf-8"))
    assert latest["golden"][0]["questions"] == 5

    schema = tmp_path / "evals.schema.json"
    run_cli(monkeypatch, "schema", "--out", str(schema))
    assert json.loads(schema.read_text(encoding="utf-8"))["title"] == "highnet-rag eval results"
