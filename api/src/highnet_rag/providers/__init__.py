"""Provider wiring. Clients are built on first use; nothing talks to the network at import."""

from dataclasses import dataclass
from functools import lru_cache

from highnet_rag.config import Settings, get_settings
from highnet_rag.providers.base import AnswerModel, Embedder, Reranker
from highnet_rag.providers.claude import ClaudeAnswerModel
from highnet_rag.providers.fake import FakeAnswerModel, FakeEmbedder, FakeReranker
from highnet_rag.providers.voyage import VoyageClient, VoyageEmbedder, VoyageReranker


@dataclass
class Providers:
    embedder: Embedder
    reranker: Reranker
    answer: AnswerModel


def build_providers(settings: Settings) -> Providers:
    if settings.fake_providers:
        return Providers(FakeEmbedder(settings.embed_dims), FakeReranker(), FakeAnswerModel())
    voyage = VoyageClient(settings)
    return Providers(
        embedder=VoyageEmbedder(voyage, settings.voyage_embed_model, settings.embed_dims),
        reranker=VoyageReranker(voyage, settings.voyage_rerank_model),
        answer=ClaudeAnswerModel(settings, settings.answer_model),
    )


@lru_cache
def get_providers() -> Providers:
    return build_providers(get_settings())
