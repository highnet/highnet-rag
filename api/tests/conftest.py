import asyncio
import json
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from highnet_rag.app import create_app
from highnet_rag.config import Settings
from highnet_rag.ingest.build import build_corpus
from highnet_rag.ingest.squad import load_squad
from highnet_rag.providers import build_providers

SQUAD_FIXTURE = {
    "version": "v2.0",
    "data": [
        {
            "title": "Normans",
            "paragraphs": [
                {
                    "context": (
                        "The Normans were the people who in the 10th and 11th centuries gave "
                        "their name to Normandy, a region in France. They were descended from "
                        "Norse raiders. In 1066 the Normans conquered England at the Battle of "
                        "Hastings."
                    ),
                    "qas": [
                        {
                            "id": "q1",
                            "question": "In what country is Normandy located?",
                            "answers": [{"text": "France", "answer_start": 124}],
                            "is_impossible": False,
                        },
                        {
                            "id": "q2",
                            "question": "Who gave their name to Normandy in the 1000s?",
                            "answers": [],
                            "is_impossible": True,
                        },
                    ],
                }
            ],
        },
        {
            "title": "Amazon_rainforest",
            "paragraphs": [
                {
                    "context": (
                        "The Amazon rainforest covers most of the Amazon basin of South America. "
                        "The basin encompasses seven million square kilometres. The rainforest "
                        "spans nine nations, with the majority in Brazil."
                    ),
                    "qas": [],
                }
            ],
        },
        {
            "title": "Oxygen",
            "paragraphs": [
                {
                    "context": (
                        "Oxygen is a chemical element with symbol O and atomic number 8. It is a "
                        "highly reactive nonmetal and an oxidizing agent. Oxygen was discovered "
                        "by Carl Wilhelm Scheele in Uppsala."
                    ),
                    "qas": [],
                }
            ],
        },
    ],
}


@pytest.fixture(scope="session")
def squad_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("squad") / "dev.json"
    path.write_text(json.dumps(SQUAD_FIXTURE), encoding="utf-8")
    return path


@pytest.fixture(scope="session")
def corpus_path(tmp_path_factory: pytest.TempPathFactory, squad_path: Path) -> Path:
    out = tmp_path_factory.mktemp("corpus") / "corpus.sqlite"
    settings = Settings(fake_providers=True, embed_dims=64, _env_file=None)  # pyright: ignore[reportCallIssue]
    embedder = build_providers(settings).embedder
    asyncio.run(
        build_corpus(
            load_squad(squad_path), out, embedder, settings, ["small", "medium"], log=lambda _: None
        )
    )
    return out


@pytest.fixture
def make_settings(tmp_path: Path, corpus_path: Path):
    def make(**overrides: object) -> Settings:
        base: dict[str, object] = {
            "fake_providers": True,
            "embed_dims": 64,
            "corpus_db_path": corpus_path,
            "state_db_path": tmp_path / "state.sqlite",
            "static_dir": tmp_path / "no-static",
            "_env_file": None,
        }
        return Settings(**{**base, **overrides})  # pyright: ignore[reportArgumentType]

    return make


@pytest.fixture
def client(make_settings) -> Iterator[TestClient]:
    with TestClient(create_app(make_settings())) as c:
        yield c


def parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for block in body.strip().split("\n\n"):
        lines = block.splitlines()
        if not lines or lines[0].startswith(":"):
            continue
        name = lines[0].removeprefix("event: ")
        data = json.loads(lines[1].removeprefix("data: "))
        events.append((name, data))
    return events
