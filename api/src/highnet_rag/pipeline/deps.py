from dataclasses import dataclass, field
from typing import Literal

import numpy as np
from pydantic import BaseModel, Field

from highnet_rag.config import Settings
from highnet_rag.providers import Providers
from highnet_rag.storage.base import CorpusStore, MapPoint, StateStore

# Milestone 1 runs vector search only; BM25/hybrid, reranking and agentic mode join in M2-M4.
SUPPORTED_MODES = ("vector",)


class QueryParams(BaseModel):
    q: str = Field(min_length=1, max_length=500)
    mode: Literal["vector"] = "vector"
    k: int = Field(default=5, ge=1, le=10)
    chunk_set: str = "medium"


@dataclass
class Deps:
    settings: Settings
    corpus: CorpusStore
    state: StateStore
    providers: Providers
    _map_cache: dict[int, tuple[np.ndarray, list[MapPoint]]] = field(default_factory=dict)

    def map_matrix(self, chunk_set_id: int) -> tuple[np.ndarray, list[MapPoint]]:
        if chunk_set_id not in self._map_cache:
            points = self.corpus.map_points(chunk_set_id)
            coords = np.asarray([(p.x, p.y) for p in points], dtype=np.float32).reshape(-1, 2)
            self._map_cache[chunk_set_id] = (coords, points)
        return self._map_cache[chunk_set_id]
