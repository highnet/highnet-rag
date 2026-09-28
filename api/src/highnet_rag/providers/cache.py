"""Caches in front of the providers, for batch jobs (evals, recording the demo questions).

A repeated call returns the first call's result without contacting the API. The embedder says
so honestly (0 tokens); an answer repeats the first call's usage, because a recording shows what
that answer cost to generate, while `misses` counts only what was actually paid for.
"""

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from highnet_rag.providers.base import (
    AgentTurn,
    AnswerModel,
    Embedder,
    Embeddings,
    FinalAnswer,
    InputType,
)


class CachedEmbedder:
    def __init__(self, inner: Embedder) -> None:
        self._inner = inner
        self.provider, self.model, self.dims = inner.provider, inner.model, inner.dims
        self._cache: dict[tuple[str, str], Embeddings] = {}

    async def embed(self, texts: list[str], input_type: InputType) -> Embeddings:
        key = ("\n".join(texts), input_type)
        if key in self._cache:
            return Embeddings(self._cache[key].vectors, tokens=0)
        result = await self._inner.embed(texts, input_type)
        self._cache[key] = result
        return result


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


class CachedAnswerModel:
    def __init__(self, inner: AnswerModel) -> None:
        self.inner = inner
        self.provider, self.model = inner.provider, inner.model
        self.misses: list[Usage] = []
        self._answers: dict[str, tuple[list[str], FinalAnswer]] = {}
        self._turns: dict[str, AgentTurn] = {}
        self._counts: dict[str, int] = {}

    async def count_tokens(
        self,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> int:
        key = json.dumps([system, messages, tools], sort_keys=True)
        if key not in self._counts:
            self._counts[key] = await self.inner.count_tokens(system, messages, tools)
        return self._counts[key]

    async def agent_turn(
        self,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int,
    ) -> AgentTurn:
        key = json.dumps([system, messages, tools, max_tokens], sort_keys=True)
        if key not in self._turns:
            turn = await self.inner.agent_turn(system, messages, tools, max_tokens)
            self.misses.append(Usage(turn.input_tokens, turn.output_tokens))
            self._turns[key] = turn
        return self._turns[key]

    async def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        key = json.dumps([system, messages, max_tokens], sort_keys=True)
        if key not in self._answers:
            deltas: list[str] = []
            final: FinalAnswer | None = None
            async for part in self.inner.stream_answer(system, messages, max_tokens):
                if isinstance(part, FinalAnswer):
                    final = part
                else:
                    deltas.append(part)
            if final is None:
                raise RuntimeError("The model stream ended without a final message.")
            self.misses.append(Usage(final.input_tokens, final.output_tokens))
            self._answers[key] = (deltas, final)
        deltas, final = self._answers[key]
        for delta in deltas:
            yield delta
        yield final
