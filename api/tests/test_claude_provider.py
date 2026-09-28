"""ClaudeAnswerModel against a stand-in for anthropic.AsyncAnthropic (no network)."""

from types import SimpleNamespace

import pytest
from pydantic import SecretStr

from highnet_rag.config import Settings
from highnet_rag.providers import claude as claude_module
from highnet_rag.providers.base import FinalAnswer, ProviderNotConfiguredError
from highnet_rag.providers.claude import ClaudeAnswerModel, ClaudeJudge


class FakeStream:
    def __init__(self, message: SimpleNamespace) -> None:
        self.message = message

    async def __aenter__(self) -> "FakeStream":
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None

    async def get_final_message(self) -> SimpleNamespace:
        return self.message


class FakeMessages:
    def __init__(self, message: SimpleNamespace) -> None:
        self.message = message
        self.calls: list[dict] = []

    async def count_tokens(self, **kwargs: object) -> SimpleNamespace:
        self.calls.append({"count": kwargs})
        return SimpleNamespace(input_tokens=321)

    def stream(self, **kwargs: object) -> FakeStream:
        self.calls.append({"stream": kwargs})
        stream = FakeStream(self.message)

        async def text_stream():
            for part in ("Nor", "mandy"):
                yield part

        stream.text_stream = text_stream()  # type: ignore[attr-defined]
        return stream


def final_message() -> SimpleNamespace:
    cited = SimpleNamespace(document_index=1, cited_text="in France")
    web = SimpleNamespace(url="https://example.com", cited_text="ignored")
    return SimpleNamespace(
        content=[
            SimpleNamespace(type="thinking", thinking=""),
            SimpleNamespace(type="text", text="Normandy is in France.", citations=[cited, web]),
            SimpleNamespace(type="text", text=" Done.", citations=None),
        ],
        stop_reason="end_turn",
        usage=SimpleNamespace(input_tokens=321, output_tokens=12, cache_read_input_tokens=None),
    )


@pytest.fixture
def model(monkeypatch: pytest.MonkeyPatch) -> tuple[ClaudeAnswerModel, FakeMessages]:
    messages = FakeMessages(final_message())
    created: list[str] = []

    def fake_client(api_key: str, **options: object) -> SimpleNamespace:
        created.append(api_key)
        return SimpleNamespace(messages=messages)

    monkeypatch.setattr(claude_module.anthropic, "AsyncAnthropic", fake_client)
    settings = Settings(anthropic_api_key=SecretStr("sk-test"), _env_file=None)  # pyright: ignore[reportCallIssue]
    m = ClaudeAnswerModel(settings, "claude-haiku-4-5")
    return m, messages


async def test_count_tokens_uses_the_configured_model(model) -> None:
    m, messages = model
    assert await m.count_tokens("sys", [{"role": "user", "content": "q"}]) == 321
    await m.count_tokens("sys", [])  # the client is built once and reused
    assert messages.calls[0]["count"]["model"] == "claude-haiku-4-5"


async def test_stream_yields_text_then_a_parsed_final_answer(model) -> None:
    m, messages = model
    parts = [p async for p in m.stream_answer("sys", [{"role": "user", "content": "q"}], 256)]
    assert parts[:2] == ["Nor", "mandy"]
    final = parts[2]
    assert isinstance(final, FinalAnswer)
    assert final.text == "Normandy is in France. Done."
    assert [(c.document_index, c.cited_text) for c in final.blocks[0].citations] == [
        (1, "in France")
    ]
    assert final.blocks[1].citations == []
    assert (final.input_tokens, final.output_tokens, final.cache_read_input_tokens) == (321, 12, 0)
    assert messages.calls[0]["stream"]["max_tokens"] == 256


async def test_missing_key_raises_on_first_use() -> None:
    m = ClaudeAnswerModel(Settings(_env_file=None), "claude-haiku-4-5")  # pyright: ignore[reportCallIssue]
    with pytest.raises(ProviderNotConfiguredError):
        await m.count_tokens("sys", [])


async def test_agent_turn_returns_text_tool_calls_and_usage(model) -> None:
    m, messages = model
    response = SimpleNamespace(
        content=[
            SimpleNamespace(type="text", text="I'll search twice."),
            SimpleNamespace(type="tool_use", id="t1", name="search", input={"query": "Harvard"}),
        ],
        stop_reason="tool_use",
        usage=SimpleNamespace(input_tokens=90, output_tokens=20),
    )

    async def create(**kwargs: object) -> SimpleNamespace:
        messages.calls.append({"create": kwargs})
        return response

    messages.create = create  # type: ignore[attr-defined]
    tools = [{"name": "search", "input_schema": {"type": "object"}}]
    turn = await m.agent_turn("sys", [{"role": "user", "content": "q"}], tools, 256)
    assert turn.text == "I'll search twice." and turn.stop_reason == "tool_use"
    assert [(c.name, c.input) for c in turn.calls] == [("search", {"query": "Harvard"})]
    assert turn.content[-1] == {
        "type": "tool_use",
        "id": "t1",
        "name": "search",
        "input": {"query": "Harvard"},
    }
    assert (turn.input_tokens, turn.output_tokens) == (90, 20)
    sent = messages.calls[-1]["create"]
    assert sent["tools"] == tools and sent["max_tokens"] == 256
    assert await m.count_tokens("sys", [], tools) == 321
    assert messages.calls[-1]["count"]["tools"] == tools


async def test_judge_forces_its_tool_and_returns_the_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict] = []
    replies = [
        SimpleNamespace(
            content=[
                SimpleNamespace(type="text", text="Grading."),
                SimpleNamespace(type="tool_use", id="t1", name="grade", input={"correct": True}),
            ],
            stop_reason="tool_use",
            usage=SimpleNamespace(input_tokens=500, output_tokens=40),
        ),
        SimpleNamespace(
            content=[SimpleNamespace(type="text", text="No.")],
            stop_reason="end_turn",
            usage=SimpleNamespace(input_tokens=5, output_tokens=1),
        ),
    ]

    async def create(**kwargs: object) -> SimpleNamespace:
        calls.append(kwargs)
        return replies[len(calls) - 1]

    monkeypatch.setattr(
        claude_module.anthropic,
        "AsyncAnthropic",
        lambda api_key, **options: SimpleNamespace(messages=SimpleNamespace(create=create)),
    )
    settings = Settings(anthropic_api_key=SecretStr("sk-test"), _env_file=None)  # pyright: ignore[reportCallIssue]
    judge = ClaudeJudge(settings, "claude-sonnet-5")
    tool = {"name": "grade", "input_schema": {"type": "object"}}
    result = await judge.call("sys", "{}", tool)
    assert (result.input, result.input_tokens, result.output_tokens) == ({"correct": True}, 500, 40)
    assert calls[0]["tool_choice"] == {"type": "tool", "name": "grade"}
    assert calls[0]["model"] == "claude-sonnet-5"
    with pytest.raises(RuntimeError, match="did not call grade"):
        await judge.call("sys", "{}", tool)
