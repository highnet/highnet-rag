"""Voyage AI embeddings and reranking over its REST API (two endpoints; plain httpx keeps the
dependency tree small - the Python SDK pulls in LangChain and tokenizers)."""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

import httpx
import numpy as np

from highnet_rag.config import Settings
from highnet_rag.providers.base import (
    Embeddings,
    InputType,
    ProviderNotConfiguredError,
    Reranked,
    RerankResult,
)

# Rate limits (429) and transient server errors are retried; everything else fails at once.
RETRYABLE = frozenset({429, 500, 502, 503, 504})


class VoyageClient:
    """Created lazily by `providers.get_providers()`; the HTTP client opens on first request."""

    def __init__(
        self,
        settings: Settings,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self._settings = settings
        self._http: httpx.AsyncClient | None = None
        self._sleep = sleep

    def _client(self) -> httpx.AsyncClient:
        key = self._settings.voyage_api_key
        if key is None or not key.get_secret_value():
            raise ProviderNotConfiguredError("VOYAGE_API_KEY is not set.")
        if self._http is None:
            self._http = httpx.AsyncClient(
                base_url=self._settings.voyage_base_url,
                headers={"Authorization": f"Bearer {key.get_secret_value()}"},
                timeout=httpx.Timeout(30.0, connect=5.0),
            )
        return self._http

    def _retry_delay(self, response: httpx.Response, attempt: int) -> float:
        header = response.headers.get("retry-after", "")
        wait = float(header) if header.replace(".", "", 1).isdigit() else 2.0**attempt
        return min(wait, self._settings.voyage_max_retry_wait_seconds)

    async def post(self, path: str, payload: dict[str, Any]) -> tuple[dict[str, Any], int]:
        """Returns the JSON body and how many retries it took (reported in the trace)."""
        retries = 0
        while True:
            response = await self._client().post(path, json=payload)
            if response.status_code in RETRYABLE and retries < self._settings.voyage_max_retries:
                retries += 1
                await self._sleep(self._retry_delay(response, retries))
                continue
            response.raise_for_status()
            return response.json(), retries


class VoyageEmbedder:
    provider = "voyage"

    def __init__(self, client: VoyageClient, model: str, dims: int) -> None:
        self._client = client
        self.model = model
        self.dims = dims

    # snippet: embed_query | Voyage embeddings request
    async def embed(self, texts: list[str], input_type: InputType) -> Embeddings:
        body, retries = await self._client.post(
            "/embeddings",
            {
                "input": texts,
                "model": self.model,
                "input_type": input_type,
                "output_dimension": self.dims,
            },
        )
        rows = sorted(body["data"], key=lambda d: d["index"])
        vectors = np.asarray([r["embedding"] for r in rows], dtype=np.float32)
        return Embeddings(
            vectors=vectors, tokens=int(body["usage"]["total_tokens"]), retries=retries
        )

    # /snippet


class VoyageReranker:
    provider = "voyage"

    def __init__(self, client: VoyageClient, model: str) -> None:
        self._client = client
        self.model = model

    async def rerank(self, query: str, documents: list[str], top_k: int) -> Reranked:
        body, retries = await self._client.post(
            "/rerank",
            {"query": query, "documents": documents, "model": self.model, "top_k": top_k},
        )
        results = [RerankResult(int(r["index"]), float(r["relevance_score"])) for r in body["data"]]
        return Reranked(results=results, tokens=int(body["usage"]["total_tokens"]), retries=retries)
