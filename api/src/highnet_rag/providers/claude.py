"""Claude via the Anthropic Python SDK. The client is constructed lazily on first use."""

from collections.abc import AsyncIterator
from typing import Any

import anthropic

from highnet_rag.config import Settings
from highnet_rag.providers.base import (
    AgentTurn,
    AnswerBlock,
    Citation,
    FinalAnswer,
    ProviderNotConfiguredError,
    ToolCall,
)


class ClaudeAnswerModel:
    provider = "anthropic"

    def __init__(self, settings: Settings, model: str) -> None:
        self._settings = settings
        self.model = model
        self._client: anthropic.AsyncAnthropic | None = None

    def _get_client(self) -> anthropic.AsyncAnthropic:
        if self._client is None:
            key = self._settings.anthropic_api_key
            if key is None or not key.get_secret_value():
                raise ProviderNotConfiguredError("ANTHROPIC_API_KEY is not set.")
            self._client = anthropic.AsyncAnthropic(api_key=key.get_secret_value())
        return self._client

    async def count_tokens(
        self,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> int:
        result = await self._get_client().messages.count_tokens(
            model=self.model,
            system=system,
            messages=messages,  # pyright: ignore[reportArgumentType]
            tools=tools or [],  # pyright: ignore[reportArgumentType]
        )
        return result.input_tokens

    # snippet: agent_plan,agent_step | One agent turn: Claude may call search or answer
    async def agent_turn(
        self,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int,
    ) -> AgentTurn:
        response = await self._get_client().messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,  # pyright: ignore[reportArgumentType]
            tools=tools,  # pyright: ignore[reportArgumentType]
        )
        text = "".join(b.text for b in response.content if b.type == "text")
        calls = [
            ToolCall(id=b.id, name=b.name, input=dict(b.input))  # pyright: ignore[reportArgumentType]
            for b in response.content
            if b.type == "tool_use"
        ]
        content: list[dict[str, Any]] = [
            {"type": "text", "text": b.text} for b in response.content if b.type == "text"
        ] + [{"type": "tool_use", "id": c.id, "name": c.name, "input": c.input} for c in calls]
        return AgentTurn(
            text=text,
            calls=calls,
            stop_reason=response.stop_reason,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            content=content,
        )

    # /snippet

    # snippet: generate | Claude streaming call
    async def stream_answer(
        self, system: str, messages: list[dict[str, Any]], max_tokens: int
    ) -> AsyncIterator[str | FinalAnswer]:
        async with self._get_client().messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,  # pyright: ignore[reportArgumentType]
        ) as stream:
            async for text in stream.text_stream:
                yield text
            message = await stream.get_final_message()

        blocks: list[AnswerBlock] = []
        for block in message.content:
            if block.type != "text":
                continue
            citations = [
                Citation(document_index=index, cited_text=c.cited_text)
                for c in (block.citations or [])
                if isinstance(index := getattr(c, "document_index", None), int)
            ]
            blocks.append(AnswerBlock(text=block.text, citations=citations))
        usage = message.usage
        yield FinalAnswer(
            blocks=blocks,
            stop_reason=message.stop_reason,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cache_read_input_tokens=usage.cache_read_input_tokens or 0,
        )

    # /snippet
