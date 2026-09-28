import asyncio
import json
from pathlib import Path

import pytest

from highnet_rag.config import Settings
from highnet_rag.ingest.build import build_corpus
from highnet_rag.ingest.squad import load_squad
from highnet_rag.providers import build_providers

NORMANS = (
    "The Normans were the people who in the 10th and 11th centuries gave their name to Normandy, "
    "a region in France. They were descended from Norse raiders. In 1066 the Normans conquered "
    "England at the Battle of Hastings."
)
OXYGEN = (
    "Oxygen is a chemical element with symbol O and atomic number 8. It is a highly reactive "
    "nonmetal. Oxygen was discovered by Carl Wilhelm Scheele in Uppsala in 1773."
)

SQUAD = {
    "version": "v2.0",
    "data": [
        {
            "title": "Normans",
            "paragraphs": [
                {
                    "context": NORMANS,
                    "qas": [
                        {
                            "id": "n1",
                            "question": "In what country is Normandy located?",
                            "answers": [
                                {"text": "France", "answer_start": NORMANS.index("France")},
                                {"text": "France", "answer_start": NORMANS.index("France")},
                            ],
                            "is_impossible": False,
                        },
                        {
                            "id": "n2",
                            "question": "When did the Normans conquer England?",
                            "answers": [{"text": "1066", "answer_start": NORMANS.index("1066")}],
                            "is_impossible": False,
                        },
                        {
                            "id": "n3",
                            "question": "Who gave their name to Normandy in the 1000s?",
                            "answers": [],
                            "is_impossible": True,
                        },
                    ],
                }
            ],
        },
        {
            "title": "Oxygen",
            "paragraphs": [
                {
                    "context": OXYGEN,
                    "qas": [
                        {
                            "id": "o1",
                            "question": "Who discovered oxygen?",
                            "answers": [
                                {
                                    "text": "Carl Wilhelm Scheele",
                                    "answer_start": OXYGEN.index("Carl"),
                                }
                            ],
                            "is_impossible": False,
                        },
                        {
                            "id": "o2",
                            "question": "What is the atomic weight of zinc?",
                            "answers": [],
                            "is_impossible": True,
                        },
                    ],
                }
            ],
        },
    ],
}


@pytest.fixture(scope="session")
def squad_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("squad") / "dev.json"
    path.write_text(json.dumps(SQUAD), encoding="utf-8")
    return path


@pytest.fixture(scope="session")
def corpus_path(tmp_path_factory: pytest.TempPathFactory, squad_path: Path) -> Path:
    out = tmp_path_factory.mktemp("corpus") / "corpus.sqlite"
    settings = fake_settings()
    embedder = build_providers(settings).embedder
    asyncio.run(
        build_corpus(
            load_squad(squad_path),
            out,
            embedder,
            settings,
            ["small", "medium", "large"],
            log=lambda _: None,
        )
    )
    return out


def fake_settings(**overrides: object) -> Settings:
    base: dict[str, object] = {"fake_providers": True, "embed_dims": 64, "_env_file": None}
    return Settings(**{**base, **overrides})  # pyright: ignore[reportArgumentType]
