"""Golden question sets (evals/golden/*.jsonl) and the builder for `squad_auto`.

- `squad_auto`: answerable and unanswerable questions picked from the SQuAD 2.0 dev set. Each
  answerable row carries its gold answers as character spans into the article text, so
  relevance is exact: a chunk is relevant when it contains a whole gold span.
- `owner`: written by the owner. Each answerable row quotes its evidence from the article; the
  quote's position gives the span.
- `compound`: questions that join facts from two articles, for agentic mode.
"""

import hashlib
import json
from collections.abc import Sequence
from pathlib import Path

from pydantic import BaseModel, Field

from highnet_rag.ingest.squad import Article

SQUAD_ANSWERABLE_PER_ARTICLE = 3
SQUAD_UNANSWERABLE_TOTAL = 45
SQUAD_UNANSWERABLE_PER_ARTICLE = 2


class GoldSpan(BaseModel):
    text: str
    start: int
    end: int


class SquadRow(BaseModel):
    id: str
    article: str
    question: str
    answerable: bool
    answers: list[GoldSpan] = Field(default_factory=list)


class OwnerRow(BaseModel):
    id: str
    article: str
    question: str
    answerable: bool
    answer: str = ""  # the expected answer, in words
    evidence: str = ""  # a verbatim quote from the article that contains the answer


class CompoundRow(BaseModel):
    id: str
    question: str
    articles: list[str]
    answer: str
    source: str = ""


class Golden(BaseModel):
    squad_auto: list[SquadRow]
    owner: list[OwnerRow]
    compound: list[CompoundRow]


def _read_jsonl[T: BaseModel](path: Path, model: type[T]) -> list[T]:
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    return [model.model_validate_json(line) for line in lines if line.strip()]


def load_golden(directory: Path) -> Golden:
    return Golden(
        squad_auto=_read_jsonl(directory / "squad_auto.jsonl", SquadRow),
        owner=_read_jsonl(directory / "owner.jsonl", OwnerRow),
        compound=_read_jsonl(directory / "compound.jsonl", CompoundRow),
    )


def write_jsonl(path: Path, rows: Sequence[BaseModel]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "".join(json.dumps(r.model_dump(), ensure_ascii=False) + "\n" for r in rows)
    path.write_text(body, encoding="utf-8")


def _order(question_id: str) -> str:
    """A stable pseudo-random order: the same SQuAD file always yields the same golden set."""
    return hashlib.sha256(question_id.encode()).hexdigest()


def build_squad_auto(
    articles: Sequence[Article],
    answerable_per_article: int = SQUAD_ANSWERABLE_PER_ARTICLE,
    unanswerable_total: int = SQUAD_UNANSWERABLE_TOTAL,
    unanswerable_per_article: int = SQUAD_UNANSWERABLE_PER_ARTICLE,
) -> list[SquadRow]:
    answerable: list[SquadRow] = []
    unanswerable: list[SquadRow] = []
    for article in articles:
        ordered = sorted(article.questions, key=lambda q: _order(q.id))
        picked = [q for q in ordered if q.answerable][:answerable_per_article]
        answerable += [
            SquadRow(
                id=q.id,
                article=article.title,
                question=q.question,
                answerable=True,
                answers=[
                    GoldSpan(text=a.text, start=a.start, end=a.start + len(a.text))
                    for a in dict.fromkeys(q.answers)  # annotators often mark the same span
                ],
            )
            for q in picked
        ]
        unanswerable += [
            SquadRow(id=q.id, article=article.title, question=q.question, answerable=False)
            for q in [q for q in ordered if not q.answerable][:unanswerable_per_article]
        ]
    unanswerable = sorted(unanswerable, key=lambda r: _order(r.id))[:unanswerable_total]
    return answerable + sorted(unanswerable, key=lambda r: (r.article, _order(r.id)))


def evidence_span(text: str, evidence: str) -> tuple[int, int] | None:
    """Where an owner row's quoted evidence sits in its article, or None if it is not there."""
    start = text.find(evidence) if evidence else -1
    return (start, start + len(evidence)) if start >= 0 else None
