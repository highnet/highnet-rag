"""Provider interfaces. Only modules in `providers/` talk to external APIs."""

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

import numpy as np

InputType = Literal["query", "document"]


class ProviderNotConfiguredError(RuntimeError):
    """An API key is missing. Raised on first use, never at startup."""


@dataclass
class Embeddings:
    vectors: np.ndarray  # shape (n, dims), float32
    tokens: int


@dataclass
class RerankResult:
    index: int
    relevance: float


@dataclass
class Reranked:
    results: list[RerankResult]
    tokens: int


@dataclass
class Citation:
    document_index: int
    cited_text: str


@dataclass
class AnswerBlock:
    text: str
    citations: list[Citation] = field(default_factory=list)


@dataclass
class FinalAnswer:
    blocks: list[AnswerBlock]
    stop_reason: str | None
    input_tokens: int
    output_tokens: int
    cache_read_input_tokens: int = 0

    @property
    def text(self) -> str:
        return "".join(b.text for b in self.blocks)


class Embedder(Protocol):
    provider: str
    model: str
    dims: int

    async def embed(self, texts: list[str], input_type: InputType) -> Embeddings: ...


class Reranker(Protocol):
    provider: str
    model: str

    async def rerank(self, query: str, documents: list[str], top_k: int) -> Reranked: ...


class AnswerModel(Protocol):
    provider: str
    model: str

    async def count_tokens(self, system: str, messages: list[dict[str, Any]]) -> int: ...

    def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        """Yields text deltas, then exactly one FinalAnswer."""
        ...
