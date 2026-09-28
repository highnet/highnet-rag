"""One retrieval pass (embed -> map -> BM25 -> vector -> fuse -> rerank), shared by the classic
pipeline and every search the agent makes. Each stage emits its own trace event; inside an
agent search they carry the search's step as `parent` and a sub-label such as "3a.2".
"""

import itertools
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from highnet_rag.budget import BudgetState
from highnet_rag.pipeline.deps import Deps, QueryParams
from highnet_rag.pipeline.retrieve import RRF_K, bm25_idf, fts_query, question_words, rrf
from highnet_rag.pricing import cost_usd
from highnet_rag.storage.base import ChunkSet, CorpusStore, Hit
from highnet_rag.trace import AnswerDelta, RunDone, Stage, StageClock, TraceEvent, Tracer

Event = TraceEvent | AnswerDelta | RunDone
Spend = Callable[[str, str, str, int, int, float], None]
MAP_NEIGHBOURS = 5
HYBRID_DEPTH_FACTOR = 2


def doc_titles(corpus: CorpusStore, hits: list[Hit]) -> dict[int, str]:
    return {c.id: c.doc_title for c in corpus.chunks([h.chunk_id for h in hits])}


@dataclass
class Retrieval:
    """What a retrieval pass hands on: the ranking it ended with and the top-k it kept."""

    ranking: str = ""
    selected: list[tuple[int, float]] = field(default_factory=list)
    failed: bool = False


class NestedTracer:
    """Stamps every event with the agent step it belongs to (no-op for the classic pipeline)."""

    def __init__(self, tracer: Tracer, parent: str | None) -> None:
        self._tracer = tracer
        self._parent = parent
        self._count = itertools.count(1)

    def _mark(self) -> dict[str, Any]:
        if self._parent is None:
            return {}
        return {"parent": self._parent, "label": f"{self._parent}.{next(self._count)}"}

    def event(self, stage: Stage, clock: StageClock, data: dict[str, Any], **kw: Any) -> TraceEvent:
        return self._tracer.event(stage, clock, data, **kw, **self._mark())

    def skipped(self, stage: Stage, reason: str) -> TraceEvent:
        return self._tracer.skipped(stage, reason, **self._mark())

    def error(self, stage: Stage, clock: StageClock, exc: BaseException) -> TraceEvent:
        return self._tracer.error(stage, clock, exc, **self._mark())


async def retrieve(
    question: str,
    params: QueryParams,
    deps: Deps,
    tracer: Tracer,
    chunk_set: ChunkSet,
    budget: BudgetState,
    spend: Spend,
    out: Retrieval,
    *,
    parent: str | None = None,
    with_map: bool = True,
) -> AsyncIterator[Event]:
    settings, corpus, providers = deps.settings, deps.corpus, deps.providers
    t = NestedTracer(tracer, parent)

    # snippet: embed_query | Embed the question
    # 2 · embed_query: BM25-only runs never need a vector, so they skip the embedding call.
    clock = StageClock()
    vector: np.ndarray | None = None
    if params.mode == "bm25":
        yield t.skipped("embed_query", "BM25 mode searches by keywords only; no embedding.")
    else:
        try:
            embedded = await providers.embedder.embed([question], "query")
        except Exception as exc:
            yield t.error("embed_query", clock, exc)
            out.failed = True
            return
        embedding: np.ndarray = embedded.vectors[0]
        vector = embedding
        cost = cost_usd(providers.embedder.model, settings, embedded.tokens)
        spend(
            "embed_query",
            providers.embedder.provider,
            providers.embedder.model,
            embedded.tokens,
            0,
            cost,
        )
        yield t.event(
            "embed_query",
            clock,
            {
                "provider": providers.embedder.provider,
                "model": providers.embedder.model,
                "input_type": "query",
                "dims": int(embedding.shape[0]),
                "vector_preview": [round(float(v), 4) for v in embedding[:8]],
                "norm": round(float(np.linalg.norm(embedding)), 4),
                "retries": embedded.retries,
            },
            tokens=embedded.tokens,
            cost_usd=cost,
        )
    # /snippet

    # snippet: map_project | Project onto the map
    # 3 · map_project: the same PCA fitted at ingest places the query on the corpus map.
    clock = StageClock()
    if not with_map:
        pass  # agent searches: the map places the visitor's own question only
    elif vector is None:
        yield t.skipped("map_project", "BM25 mode has no question embedding to place.")
    else:
        try:
            projection = corpus.projection(chunk_set.id)
            x, y = projection.project(vector)
            coords, points = deps.map_matrix(chunk_set.id)
            nearest = np.argsort(((coords - np.array([x, y])) ** 2).sum(axis=1))[:MAP_NEIGHBOURS]
            yield t.event(
                "map_project",
                clock,
                {
                    "x": round(x, 5),
                    "y": round(y, 5),
                    "explained_variance": [round(v, 4) for v in projection.explained_variance],
                    "neighbours_2d": [points[i].chunk_id for i in nearest],
                },
            )
        except Exception as exc:
            # The map is explanatory, not load-bearing: report it as a warning and carry on.
            error = {"type": type(exc).__name__, "message": str(exc)}
            yield t.event("map_project", clock, {"error": error}, status="warning")
    # /snippet

    # Fusion and reranking need candidates beyond top-k to promote, so hybrid mode and the
    # reranker fetch deeper lists; otherwise each search fetches exactly top-k.
    deep = params.mode == "hybrid" or params.rerank
    depth = params.k * HYBRID_DEPTH_FACTOR if deep else params.k
    lists: dict[str, list[Hit]] = {}

    # snippet: bm25 | Keyword search
    # 4 · bm25: the exact MATCH string goes into the trace.
    clock = StageClock()
    if params.mode == "vector":
        yield t.skipped("bm25", "Vector mode searches by meaning only.")
    else:
        match, terms = fts_query(question)
        try:
            bm25_hits = corpus.bm25(match, chunk_set.id, depth) if match else []
        except Exception as exc:
            yield t.error("bm25", clock, exc)
            out.failed = True
            return
        lists["bm25"] = bm25_hits
        titles = doc_titles(corpus, bm25_hits)
        containing = corpus.term_docs(terms, chunk_set.id)
        yield t.event(
            "bm25",
            clock,
            {
                "fts_query": match,
                "words": question_words(question),
                "terms": [
                    {
                        "term": t,
                        "chunks": containing[t],
                        "idf": round(bm25_idf(chunk_set.chunk_count, containing[t]), 4),
                    }
                    for t in terms
                ],
                "chunk_set": chunk_set.name,
                "searched": chunk_set.chunk_count,
                "depth": depth,
                "results": [
                    {
                        "chunk_id": h.chunk_id,
                        "rank": h.rank,
                        "score": round(h.score, 4),
                        "doc_title": titles[h.chunk_id],
                    }
                    for h in bm25_hits
                ],
            },
            status="ok" if bm25_hits else "warning",
        )
    # /snippet

    # snippet: vector | Vector search
    # 5 · vector
    clock = StageClock()
    if vector is None:
        yield t.skipped("vector", "BM25 mode searches by keywords only.")
    else:
        try:
            vector_hits = corpus.knn(vector, chunk_set.id, depth)
        except Exception as exc:
            yield t.error("vector", clock, exc)
            out.failed = True
            return
        lists["vector"] = vector_hits
        titles = doc_titles(corpus, vector_hits)
        yield t.event(
            "vector",
            clock,
            {
                "metric": "cosine",
                "chunk_set": chunk_set.name,
                "searched": chunk_set.chunk_count,
                "depth": depth,
                "results": [
                    {
                        "chunk_id": h.chunk_id,
                        "rank": h.rank,
                        "distance": round(h.score, 5),
                        "doc_title": titles[h.chunk_id],
                    }
                    for h in vector_hits
                ],
            },
            status="ok" if vector_hits else "warning",
        )
    # /snippet

    # snippet: fuse | Fuse the two rankings
    # 6 · fuse: reciprocal rank fusion, with each list's contribution per chunk.
    clock = StageClock()
    if params.mode != "hybrid":
        yield t.skipped("fuse", "Runs only in hybrid mode (BM25 + vector).")
        ranking = params.mode
        candidates = [(h.chunk_id, h.score) for h in lists[params.mode]]
    else:
        fused = rrf(lists)
        titles = {cid: t for hits in lists.values() for cid, t in doc_titles(corpus, hits).items()}
        yield t.event(
            "fuse",
            clock,
            {
                "method": "rrf",
                "k": RRF_K,
                "kept": params.k,
                "results": [
                    {
                        "chunk_id": f.chunk_id,
                        "rank": f.rank,
                        "score": round(f.score, 6),
                        "doc_title": titles[f.chunk_id],
                        "from": {f"{name}_rank": rank for name, rank in f.ranks.items()},
                        "contributions": {n: round(c, 6) for n, c in f.contributions.items()},
                    }
                    for f in fused
                ],
            },
            status="ok" if fused else "warning",
        )
        ranking = "fuse"
        candidates = [(f.chunk_id, f.score) for f in fused]
    selected = candidates[: params.k]
    # /snippet

    # snippet: rerank | Rerank the candidates
    # 7 · rerank: a cross-encoder reads the question with each candidate and scores it again.
    clock = StageClock()
    if not params.rerank:
        yield t.skipped("rerank", "Off. Switch the reranker on to reorder the candidates.")
    elif budget.tier != "normal":
        yield t.skipped("rerank", "Paused: this month's budget is past its 80% mark.")
    elif not candidates:
        yield t.skipped("rerank", "No candidates to rerank.")
    else:
        reranker = providers.reranker
        passages = {c.id: c for c in corpus.chunks([cid for cid, _ in candidates])}
        try:
            reranked = await reranker.rerank(
                question, [passages[cid].text for cid, _ in candidates], len(candidates)
            )
        except Exception as exc:
            # Reranking only reorders: on failure, keep the order we already have and say so.
            error = {"type": type(exc).__name__, "message": str(exc)}
            data = {"error": error, "fallback": f"Kept the {ranking} order."}
            yield t.event("rerank", clock, data, status="warning")
        else:
            cost = cost_usd(reranker.model, settings, reranked.tokens)
            spend("rerank", reranker.provider, reranker.model, reranked.tokens, 0, cost)
            before = {cid: i + 1 for i, (cid, _) in enumerate(candidates)}
            order = [(candidates[r.index][0], r.relevance) for r in reranked.results]
            yield t.event(
                "rerank",
                clock,
                {
                    "provider": reranker.provider,
                    "model": reranker.model,
                    "input": ranking,
                    "kept": params.k,
                    "retries": reranked.retries,
                    "results": [
                        {
                            "chunk_id": cid,
                            "rank": i + 1,
                            "before_rank": before[cid],
                            "relevance": round(relevance, 4),
                            "doc_title": passages[cid].doc_title,
                        }
                        for i, (cid, relevance) in enumerate(order)
                    ],
                },
                tokens=reranked.tokens,
                cost_usd=cost,
            )
            ranking = "rerank"
            selected = order[: params.k]
    # /snippet
    out.ranking, out.selected = ranking, selected
