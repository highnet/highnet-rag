import json

import httpx
import pytest
from highnet_rag.config import Settings
from highnet_rag.providers.base import ProviderNotConfiguredError
from highnet_rag.providers.voyage import VoyageClient, VoyageEmbedder, VoyageReranker
from pydantic import SecretStr


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
