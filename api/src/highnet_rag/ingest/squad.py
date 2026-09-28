"""Load the SQuAD 2.0 dev set: 35 Wikipedia articles, their paragraphs and questions."""

import json
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import quote

SQUAD_DEV_URL = "https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v2.0.json"
PARAGRAPH_SEPARATOR = "\n\n"


@dataclass(frozen=True)
class Answer:
    text: str
    start: int  # character offset into Article.text


@dataclass(frozen=True)
class Question:
    id: str
    question: str
    answerable: bool
    answers: tuple[Answer, ...]


@dataclass
class Article:
    title: str
    text: str
    source_url: str
    questions: list[Question] = field(default_factory=list)


def load_squad(path: Path) -> list[Article]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    articles: list[Article] = []
    for entry in raw["data"]:
        title = entry["title"].replace("_", " ")
        parts: list[str] = []
        questions: list[Question] = []
        offset = 0
        for paragraph in entry["paragraphs"]:
            context: str = paragraph["context"]
            for qa in paragraph["qas"]:
                answers = tuple(
                    Answer(a["text"], offset + a["answer_start"]) for a in qa["answers"]
                )
                questions.append(
                    Question(qa["id"], qa["question"], not qa.get("is_impossible", False), answers)
                )
            parts.append(context)
            offset += len(context) + len(PARAGRAPH_SEPARATOR)
        articles.append(
            Article(
                title=title,
                text=PARAGRAPH_SEPARATOR.join(parts),
                source_url=f"https://en.wikipedia.org/wiki/{quote(entry['title'])}",
                questions=questions,
            )
        )
    return articles
