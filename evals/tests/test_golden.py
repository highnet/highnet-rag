from pathlib import Path

from highnet_rag.ingest.squad import load_squad
from highnet_rag_evals.golden import (
    CompoundRow,
    OwnerRow,
    build_squad_auto,
    evidence_span,
    load_golden,
    write_jsonl,
)


def test_squad_auto_is_deterministic_and_keeps_exact_spans(squad_path: Path) -> None:
    articles = load_squad(squad_path)
    rows = build_squad_auto(articles, answerable_per_article=1, unanswerable_total=1)
    assert rows == build_squad_auto(articles, answerable_per_article=1, unanswerable_total=1)
    answerable = [r for r in rows if r.answerable]
    assert len(answerable) == 2 and len(rows) == 3
    texts = {a.title: a.text for a in articles}
    for row in answerable:
        for span in row.answers:
            assert texts[row.article][span.start : span.end] == span.text
    # Two annotators marked the same span for n1; it is kept once.
    france = next(r for r in build_squad_auto(articles) if r.id == "n1")
    assert len(france.answers) == 1


def test_golden_round_trip_and_missing_files(tmp_path: Path, squad_path: Path) -> None:
    empty = load_golden(tmp_path)
    assert (empty.squad_auto, empty.owner, empty.compound) == ([], [], [])
    rows = build_squad_auto(load_squad(squad_path))
    write_jsonl(tmp_path / "squad_auto.jsonl", rows)
    write_jsonl(
        tmp_path / "owner.jsonl",
        [OwnerRow(id="o", article="Oxygen", question="q?", answerable=False)],
    )
    (tmp_path / "compound.jsonl").write_text(
        CompoundRow(id="c", question="q?", articles=["A"], answer="a").model_dump_json() + "\n\n",
        encoding="utf-8",
    )
    golden = load_golden(tmp_path)
    assert golden.squad_auto == rows
    assert [r.id for r in golden.owner] == ["o"] and [r.id for r in golden.compound] == ["c"]


def test_evidence_span() -> None:
    assert evidence_span("abc def", "def") == (4, 7)
    assert evidence_span("abc def", "xyz") is None
    assert evidence_span("abc def", "") is None
