"""Deterministic offline providers for local development and tests (FAKE_PROVIDERS=true).

They are honest stand-ins, not mocks of quality: the embedder is a hashed bag of words, so
retrieval is lexical, and the "LLM" copies the best-matching sentence from the top chunk.
Every trace event names provider="fake" so the UI can label the run as illustrative.
"""

import asyncio
import hashlib
import re
from collections.abc import AsyncIterator
from typing import Any

import numpy as np

from highnet_rag.pipeline.prompt import NOT_FOUND
from highnet_rag.providers.base import (
    AnswerBlock,
    Citation,
    Embeddings,
    FinalAnswer,
    InputType,
    Reranked,
    RerankResult,
)

WORD = re.compile(r"[a-z0-9]+")
SENTENCE = re.compile(r"(?<=[.!?])\s+")
STOPWORDS = frozenset(
    [
        "a",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "by",
        "did",
        "do",
        "does",
        "for",
        "from",
        "had",
        "has",
        "have",
        "how",
        "in",
        "is",
        "it",
        "its",
        "of",
        "on",
        "or",
        "that",
        "the",
        "their",
        "this",
        "to",
        "was",
        "were",
        "what",
        "when",
        "where",
        "which",
        "who",
        "whom",
        "why",
        "with",
    ]
)


def words(text: str) -> list[str]:
    return [w.rstrip("s") for w in WORD.findall(text.lower()) if w not in STOPWORDS]


def approx_tokens(text: str) -> int:
    return max(1, round(len(WORD.findall(text.lower())) * 4 / 3))


def hashed_vector(text: str, dims: int) -> np.ndarray:
    vec = np.zeros(dims, dtype=np.float32)
    for w in words(text):
        digest = hashlib.blake2b(w.encode(), digest_size=8).digest()
        n = int.from_bytes(digest, "little")
        vec[n % dims] += 1.0 if (n >> 63) & 1 else -1.0
    norm = float(np.linalg.norm(vec))
    return vec / norm if norm else vec


class FakeEmbedder:
    provider = "fake"
    model = "fake-hashed-bow"

    def __init__(self, dims: int) -> None:
        self.dims = dims

    async def embed(self, texts: list[str], input_type: InputType) -> Embeddings:
        vectors = np.stack([hashed_vector(t, self.dims) for t in texts]).astype(np.float32)
        return Embeddings(vectors=vectors, tokens=sum(approx_tokens(t) for t in texts))


class FakeReranker:
    provider = "fake"
    model = "fake-word-overlap"

    async def rerank(self, query: str, documents: list[str], top_k: int) -> Reranked:
        q = set(words(query))
        scored = [
            RerankResult(i, len(q & set(words(d))) / (len(q) or 1)) for i, d in enumerate(documents)
        ]
        scored.sort(key=lambda r: r.relevance, reverse=True)
        return Reranked(results=scored[:top_k], tokens=sum(approx_tokens(d) for d in documents))


def _documents(messages: list[dict[str, Any]]) -> tuple[list[str], str]:
    content = messages[-1]["content"]
    docs = [
        " ".join(part["text"] for part in block["source"]["content"])
        for block in content
        if block.get("type") == "document"
    ]
    question = " ".join(b["text"] for b in content if b.get("type") == "text")
    return docs, question


class FakeAnswerModel:
    provider = "fake"
    model = "fake-extractive"
    not_found = NOT_FOUND

    async def count_tokens(self, system: str, messages: list[dict[str, Any]]) -> int:
        docs, question = _documents(messages)
        return approx_tokens(system) + approx_tokens(question) + sum(approx_tokens(d) for d in docs)

    async def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        docs, question = _documents(messages)
        q = set(words(question))
        best: tuple[int, int, str] = (0, -1, "")
        for i, doc in enumerate(docs):
            for sentence in SENTENCE.split(doc):
                overlap = len(q & set(words(sentence)))
                if overlap > best[0]:
                    best = (overlap, i, sentence.strip())
        if best[1] < 0:
            blocks = [AnswerBlock(text=self.not_found)]
        else:
            blocks = [
                AnswerBlock(text="According to the retrieved passage: "),
                AnswerBlock(text=best[2], citations=[Citation(best[1], best[2])]),
            ]
        for block in blocks:
            for token in re.findall(r"\S+\s*", block.text):
                await asyncio.sleep(0)
                yield token
        output = "".join(b.text for b in blocks)
        yield FinalAnswer(
            blocks=blocks,
            stop_reason="end_turn",
            input_tokens=await self.count_tokens(system, messages),
            output_tokens=approx_tokens(output),
        )
