"""Classic RAG: one pass through the stages, one trace event per stage (ARCHITECTURE section 4).

Rule zero: if a stage runs, it emits a trace event - including skips, limits and errors.
"""

import json
import uuid
from collections.abc import AsyncIterator

import numpy as np

from highnet_rag.budget import budget_state, rate_state
from highnet_rag.pipeline.deps import Deps, QueryParams
from highnet_rag.pipeline.prompt import NOT_FOUND, SYSTEM_PROMPT, build_messages
from highnet_rag.pipeline.retrieve import RRF_K, fts_query, rrf
from highnet_rag.pricing import cost_usd
from highnet_rag.providers.base import FinalAnswer
from highnet_rag.storage.base import CorpusStore, Hit
from highnet_rag.trace import AnswerDelta, RunDone, StageClock, TraceEvent, Tracer

Event = TraceEvent | AnswerDelta | RunDone
MAP_NEIGHBOURS = 5
HYBRID_DEPTH_FACTOR = 2
SCORE_NAMES = {"bm25": "bm25", "vector": "distance", "fuse": "rrf"}


def doc_titles(corpus: CorpusStore, hits: list[Hit]) -> dict[int, str]:
    return {c.id: c.doc_title for c in corpus.chunks([h.chunk_id for h in hits])}


def new_run_id() -> str:
    return uuid.uuid4().hex


async def run_classic(
    params: QueryParams, deps: Deps, ip_hash: str, run_id: str | None = None
) -> AsyncIterator[Event]:
    settings, state, corpus, providers = deps.settings, deps.state, deps.corpus, deps.providers
    tracer = Tracer(run_id or new_run_id())

    def spend(stage: str, provider: str, model: str, tin: int, tout: int, cost: float) -> None:
        state.record_spend(tracer.run_id, provider, model, stage, tin, tout, cost)

    def finish(status: str | None = None) -> RunDone:
        done = tracer.done(status)  # type: ignore[arg-type]
        state.finish_run(tracer.run_id, done.status, done.ms, done.cost_usd)
        return done

    # snippet: request | Check the request
    # 1 · request: rate limit and budget decisions happen here, in the open.
    clock = StageClock()
    rate = rate_state(state, ip_hash, settings)
    budget = budget_state(state, settings)
    chunk_set = next((s for s in corpus.chunk_sets() if s.name == params.chunk_set), None)
    request_data = {
        "run_id": tracer.run_id,
        "settings": params.model_dump(),
        "models": {
            "embed": {"provider": providers.embedder.provider, "model": providers.embedder.model},
            "answer": {"provider": providers.answer.provider, "model": providers.answer.model},
        },
        "rate_limit": rate.as_dict(),
        "budget": budget.as_dict(),
    }
    state.record_run(tracer.run_id, ip_hash, json.dumps(params.model_dump()))
    refusal = None
    if rate.limited:
        refusal = ("rate_limited", "You've reached the query limit for now. Try again later.")
    elif budget.tier == "stopped":
        refusal = (
            "budget_exhausted",
            "This month's API budget is used up, so live queries are paused until the 1st (UTC).",
        )
    elif chunk_set is None:
        refusal = ("unknown_chunk_set", f"No chunk set named {params.chunk_set!r} in this corpus.")
    if refusal:
        request_data["error"] = {"type": refusal[0], "message": refusal[1]}
        yield tracer.event("request", clock, request_data, status="error")
        yield finish("limited" if refusal[0] != "unknown_chunk_set" else "error")
        return
    assert chunk_set is not None
    yield tracer.event("request", clock, request_data)
    # /snippet

    # snippet: embed_query | Embed the question
    # 2 · embed_query: BM25-only runs never need a vector, so they skip the embedding call.
    clock = StageClock()
    vector: np.ndarray | None = None
    if params.mode == "bm25":
        yield tracer.skipped("embed_query", "BM25 mode searches by keywords only; no embedding.")
    else:
        try:
            embedded = await providers.embedder.embed([params.q], "query")
        except Exception as exc:
            yield tracer.error("embed_query", clock, exc)
            yield finish()
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
        yield tracer.event(
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
    if vector is None:
        yield tracer.skipped("map_project", "BM25 mode has no question embedding to place.")
    else:
        try:
            projection = corpus.projection(chunk_set.id)
            x, y = projection.project(vector)
            coords, points = deps.map_matrix(chunk_set.id)
            nearest = np.argsort(((coords - np.array([x, y])) ** 2).sum(axis=1))[:MAP_NEIGHBOURS]
            yield tracer.event(
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
            yield tracer.event("map_project", clock, {"error": error}, status="warning")
    # /snippet

    # Hybrid mode fetches deeper lists so fusion has candidates to promote; the other modes
    # fetch exactly top-k.
    depth = params.k * HYBRID_DEPTH_FACTOR if params.mode == "hybrid" else params.k
    lists: dict[str, list[Hit]] = {}

    # snippet: bm25 | Keyword search
    # 4 · bm25: the exact MATCH string goes into the trace.
    clock = StageClock()
    if params.mode == "vector":
        yield tracer.skipped("bm25", "Vector mode searches by meaning only.")
    else:
        match, terms = fts_query(params.q)
        try:
            bm25_hits = corpus.bm25(match, chunk_set.id, depth) if match else []
        except Exception as exc:
            yield tracer.error("bm25", clock, exc)
            yield finish()
            return
        lists["bm25"] = bm25_hits
        titles = doc_titles(corpus, bm25_hits)
        yield tracer.event(
            "bm25",
            clock,
            {
                "fts_query": match,
                "terms": terms,
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
        yield tracer.skipped("vector", "BM25 mode searches by keywords only.")
    else:
        try:
            vector_hits = corpus.knn(vector, chunk_set.id, depth)
        except Exception as exc:
            yield tracer.error("vector", clock, exc)
            yield finish()
            return
        lists["vector"] = vector_hits
        titles = doc_titles(corpus, vector_hits)
        yield tracer.event(
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
        yield tracer.skipped("fuse", "Runs only in hybrid mode (BM25 + vector).")
        ranking = params.mode
        selected = [(h.chunk_id, h.score) for h in lists[params.mode][: params.k]]
    else:
        fused = rrf(lists)
        titles = {cid: t for hits in lists.values() for cid, t in doc_titles(corpus, hits).items()}
        yield tracer.event(
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
        selected = [(f.chunk_id, f.score) for f in fused[: params.k]]
    # /snippet

    # snippet: rerank | Skip reranking in this build
    # 7 · rerank (not in this build)
    yield tracer.skipped("rerank", "Reranking arrives in a later milestone.")
    # /snippet

    # snippet: select_context | Choose the context
    # 8 · select_context: the top-k of the final ranking become the model's only facts.
    clock = StageClock()
    chunks = corpus.chunks([cid for cid, _ in selected])
    score = dict(selected)
    context_tokens = sum(c.approx_tokens for c in chunks)
    yield tracer.event(
        "select_context",
        clock,
        {
            "top_k": params.k,
            "ranking": ranking,
            "score_name": SCORE_NAMES[ranking],
            "context_tokens_approx": context_tokens,
            "chunks": [
                {
                    "chunk_id": c.id,
                    "rank": i + 1,
                    "doc_id": c.doc_id,
                    "doc_title": c.doc_title,
                    "score": round(score[c.id], 6),
                    "approx_tokens": c.approx_tokens,
                    "text": c.text,
                }
                for i, c in enumerate(chunks)
            ],
        },
    )
    # /snippet

    # snippet: prompt | Count tokens and guard the budget
    # 9 · prompt: the exact request body, its token count and the worst-case cost.
    clock = StageClock()
    answer = providers.answer
    messages = build_messages(params.q, chunks)
    max_tokens = settings.max_answer_tokens
    try:
        input_tokens = await answer.count_tokens(SYSTEM_PROMPT, messages)
        worst_case = cost_usd(answer.model, settings, input_tokens, max_tokens)
    except Exception as exc:
        yield tracer.error("prompt", clock, exc)
        yield finish()
        return
    prompt_data = {
        "provider": answer.provider,
        "model": answer.model,
        "max_tokens": max_tokens,
        "system": SYSTEM_PROMPT,
        "messages": messages,
        "input_tokens": input_tokens,
        "worst_case_cost_usd": worst_case,
    }
    budget = budget_state(state, settings)
    if worst_case > budget.remaining_usd:
        prompt_data["error"] = {
            "type": "budget_guard",
            "message": (
                f"This answer could cost up to ${worst_case:.4f}, more than the "
                f"${budget.remaining_usd:.4f} left in this month's budget."
            ),
        }
        yield tracer.event("prompt", clock, prompt_data, status="error")
        yield finish("limited")
        return
    yield tracer.event("prompt", clock, prompt_data)
    # /snippet

    # snippet: generate | Stream the answer
    # 10 · generate (answer text also streams as answer_delta events)
    clock = StageClock()
    final: FinalAnswer | None = None
    try:
        async for part in answer.stream_answer(SYSTEM_PROMPT, messages, max_tokens):
            if isinstance(part, FinalAnswer):
                final = part
            else:
                yield AnswerDelta(run_id=tracer.run_id, text=part)
        if final is None:
            raise RuntimeError("The model stream ended without a final message.")
    except Exception as exc:
        yield tracer.error("generate", clock, exc)
        yield finish()
        return
    cost = cost_usd(answer.model, settings, final.input_tokens, final.output_tokens)
    spend("generate", answer.provider, answer.model, final.input_tokens, final.output_tokens, cost)
    yield tracer.event(
        "generate",
        clock,
        {
            "provider": answer.provider,
            "model": answer.model,
            "stop_reason": final.stop_reason,
            "usage": {
                "input_tokens": final.input_tokens,
                "output_tokens": final.output_tokens,
                "cache_read_input_tokens": final.cache_read_input_tokens,
            },
            "answer": final.text,
        },
        status="warning" if final.stop_reason == "max_tokens" else "ok",
        tokens=final.input_tokens + final.output_tokens,
        cost_usd=cost,
    )
    # /snippet

    # snippet: citations | Map citations back to chunks
    # 11 · citations: map cited documents back to chunks.
    clock = StageClock()
    abstained = NOT_FOUND in final.text
    citations = []
    for block_index, block in enumerate(final.blocks):
        for c in block.citations:
            if 0 <= c.document_index < len(chunks):
                chunk = chunks[c.document_index]
                citations.append(
                    {
                        "block": block_index,
                        "chunk_id": chunk.id,
                        "doc_title": chunk.doc_title,
                        "rank": c.document_index + 1,
                        "cited_text": c.cited_text,
                    }
                )
    blocks = [
        {
            "text": b.text,
            "cited": bool(b.citations),
            "citation_ids": [c.document_index + 1 for c in b.citations],
        }
        for b in final.blocks
    ]
    uncited_chunks = sorted({c.id for c in chunks} - {c["chunk_id"] for c in citations})
    yield tracer.event(
        "citations",
        clock,
        {
            "abstained": abstained,
            "citations": citations,
            "blocks": blocks,
            "unused_chunk_ids": uncited_chunks,
        },
        status="warning" if not citations and not abstained else "ok",
    )
    # /snippet
    yield finish()
