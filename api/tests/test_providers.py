import json

import httpx
import pytest
from pydantic import SecretStr

from highnet_rag.config import Settings
from highnet_rag.providers.base import ProviderNotConfiguredError
from highnet_rag.providers.voyage import VoyageClient, VoyageEmbedder, VoyageReranker


def voyage_with(handler) -> VoyageClient:
    settings = Settings(voyage_api_key=SecretStr("k"), _env_file=None)  # pyright: ignore[reportCallIssue]
    client = VoyageClient(settings)
    client._http = httpx.AsyncClient(
        base_url=settings.voyage_base_url, transport=httpx.MockTransport(handler)
    )
    return client


async def test_voyage_embed_request_and_response_order() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(json.loads(request.content))
        data = [{"index": 1, "embedding": [0.0, 1.0]}, {"index": 0, "embedding": [1.0, 0.0]}]
        return httpx.Response(200, json={"data": data, "usage": {"total_tokens": 7}})

    result = await VoyageEmbedder(voyage_with(handler), "voyage-3.5-lite", 2).embed(
        ["a", "b"], "query"
    )
    assert seen == {
        "input": ["a", "b"],
        "model": "voyage-3.5-lite",
        "input_type": "query",
        "output_dimension": 2,
    }
    assert result.vectors.tolist() == [[1.0, 0.0], [0.0, 1.0]] and result.tokens == 7


async def test_voyage_rerank_parses_scores() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        data = [{"index": 2, "relevance_score": 0.9}, {"index": 0, "relevance_score": 0.2}]
        return httpx.Response(200, json={"data": data, "usage": {"total_tokens": 30}})

    reranked = await VoyageReranker(voyage_with(handler), "rerank-2.5-lite").rerank(
        "q", ["a", "b", "c"], 2
    )
    assert [(r.index, r.relevance) for r in reranked.results] == [(2, 0.9), (0, 0.2)]


async def test_missing_voyage_key_raises_on_first_use() -> None:
    client = VoyageClient(Settings(_env_file=None))  # pyright: ignore[reportCallIssue]
    with pytest.raises(ProviderNotConfiguredError):
        await VoyageEmbedder(client, "m", 2).embed(["x"], "query")


async def test_voyage_client_is_created_once_with_the_key() -> None:
    client = VoyageClient(Settings(voyage_api_key=SecretStr("k"), _env_file=None))  # pyright: ignore[reportCallIssue]
    first = client._client()
    assert first is client._client()
    assert first.headers["authorization"] == "Bearer k"
    await first.aclose()


async def test_fake_reranker_orders_by_word_overlap() -> None:
    from highnet_rag.providers.fake import FakeReranker

    ranked = await FakeReranker().rerank(
        "Normandy France", ["rainforest", "Normandy is in France", "France"], top_k=2
    )
    assert [r.index for r in ranked.results] == [1, 2]
    assert ranked.results[0].relevance == 1.0


async def test_fake_answer_abstains_without_overlap() -> None:
    from highnet_rag.providers.fake import FakeAnswerModel

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "document", "source": {"content": [{"type": "text", "text": "Oxygen."}]}},
                {"type": "text", "text": "Question: Who won the World Cup?"},
            ],
        }
    ]
    parts = [p async for p in FakeAnswerModel().stream_answer("", messages, 50)]
    assert parts[-1].text == FakeAnswerModel.not_found  # type: ignore[union-attr]


def test_get_providers_follows_settings(monkeypatch) -> None:
    from highnet_rag.config import get_settings
    from highnet_rag.providers import get_providers

    monkeypatch.setenv("FAKE_PROVIDERS", "true")
    get_settings.cache_clear()
    get_providers.cache_clear()
    try:
        assert get_providers().answer.provider == "fake"
    finally:
        get_settings.cache_clear()
        get_providers.cache_clear()


def retrying_client(responses: list[httpx.Response], **settings: object):
    waits: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        waits.append(seconds)

    config = Settings(voyage_api_key=SecretStr("k"), _env_file=None, **settings)  # pyright: ignore[reportCallIssue]
    client = VoyageClient(config, sleep=fake_sleep)
    queue = iter(responses)
    client._http = httpx.AsyncClient(
        base_url=config.voyage_base_url, transport=httpx.MockTransport(lambda r: next(queue))
    )
    return client, waits


async def test_rate_limits_are_retried_with_retry_after_and_counted() -> None:
    ok = {"data": [{"index": 0, "embedding": [1.0]}], "usage": {"total_tokens": 3}}
    client, waits = retrying_client(
        [
            httpx.Response(429, headers={"retry-after": "7"}),
            httpx.Response(503),
            httpx.Response(200, json=ok),
        ],
        voyage_max_retries=3,
        voyage_max_retry_wait_seconds=5,
    )
    result = await VoyageEmbedder(client, "m", 1).embed(["x"], "query")
    assert result.retries == 2
    assert waits == [5, 4.0]  # Retry-After capped at 5s, then exponential backoff (2**2)


async def test_retries_give_up_and_non_retryable_errors_fail_at_once() -> None:
    client, waits = retrying_client(
        [httpx.Response(429), httpx.Response(429)], voyage_max_retries=1
    )
    with pytest.raises(httpx.HTTPStatusError):
        await VoyageEmbedder(client, "m", 1).embed(["x"], "query")
    assert waits == [2.0]
    client, waits = retrying_client([httpx.Response(401)])
    with pytest.raises(httpx.HTTPStatusError):
        await VoyageReranker(client, "r").rerank("q", ["d"], 1)
    assert waits == []
