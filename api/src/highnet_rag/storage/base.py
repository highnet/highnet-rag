"""Storage interfaces. The pipeline depends only on these Protocols, so a Postgres/pgvector
implementation can replace SQLite later without touching pipeline code."""

from dataclasses import dataclass
from typing import Protocol

import numpy as np


@dataclass(frozen=True)
class ChunkSet:
    id: int
    name: str
    target_tokens: int
    overlap_tokens: int
    chunk_count: int


@dataclass(frozen=True)
class Chunk:
    id: int
    chunk_set_id: int
    doc_id: int
    doc_title: str
    ord: int
    text: str
    start_char: int
    end_char: int
    approx_tokens: int
    x: float
    y: float


@dataclass(frozen=True)
class Hit:
    chunk_id: int
    rank: int
    score: float


@dataclass(frozen=True)
class Span:
    """A chunk's place in its article: character offsets into the article text."""

    chunk_id: int
    doc_id: int
    start: int
    end: int


@dataclass(frozen=True)
class MapPoint:
    chunk_id: int
    doc_id: int
    x: float
    y: float


@dataclass(frozen=True)
class Projection:
    """PCA fitted at ingest: 2D = (v - mean) @ components.T"""

    mean: np.ndarray
    components: np.ndarray
    explained_variance: tuple[float, float]

    # snippet: map_project | Project a vector to 2D
    def project(self, vector: np.ndarray) -> tuple[float, float]:
        x, y = (vector - self.mean) @ self.components.T
        return float(x), float(y)

    # /snippet


class CorpusStore(Protocol):
    def meta(self) -> dict[str, str]: ...
    def chunk_sets(self) -> list[ChunkSet]: ...
    def bm25(self, fts_query: str, chunk_set_id: int, k: int) -> list[Hit]: ...

    def term_docs(self, terms: list[str], chunk_set_id: int) -> dict[str, int]: ...
    def knn(self, vector: np.ndarray, chunk_set_id: int, k: int) -> list[Hit]: ...
    def chunks(self, ids: list[int]) -> list[Chunk]: ...
    def map_points(self, chunk_set_id: int) -> list[MapPoint]: ...

    def documents(self) -> dict[int, str]: ...
    def projection(self, chunk_set_id: int) -> Projection: ...

    # For the evals: where each chunk sits in its article, and the articles' text.
    def spans(self, chunk_set_id: int) -> list[Span]: ...
    def document_text(self, doc_id: int) -> str: ...


class StateStore(Protocol):
    def record_run(self, run_id: str, ip_hash: str, settings_json: str) -> None: ...
    def finish_run(self, run_id: str, status: str, ms: int, cost_usd: float) -> None: ...
    def record_spend(
        self,
        run_id: str | None,
        provider: str,
        model: str,
        stage: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
    ) -> None: ...
    def month_spend(self) -> float: ...
    def runs_since(self, ip_hash: str, seconds: int) -> int: ...
