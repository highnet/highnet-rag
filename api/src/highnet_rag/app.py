"""FastAPI app: `/api/*` plus the exported Next.js site, from one origin."""

import asyncio
import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from highnet_rag.budget import budget_state, hash_ip
from highnet_rag.config import Settings, get_settings
from highnet_rag.pipeline.classic import new_run_id, run_classic
from highnet_rag.pipeline.deps import DEFAULT_MODE, SUPPORTED_MODES, Deps, Mode, QueryParams
from highnet_rag.providers import Providers, build_providers
from highnet_rag.storage.base import CorpusStore
from highnet_rag.storage.sqlite import SqliteCorpusStore, SqliteStateStore
from highnet_rag.trace import AnswerDelta, RunDone, TraceEvent

SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def sse(event: str, payload: str) -> str:
    return f"event: {event}\ndata: {payload}\n\n"


def client_ip(request: Request) -> str:
    return request.headers.get("fly-client-ip") or (request.client.host if request.client else "")


def get_deps(request: Request) -> Deps:
    deps: Deps | None = request.app.state.deps
    if deps is None:
        raise HTTPException(503, detail=request.app.state.corpus_error or "Corpus not loaded.")
    return deps


DepsDep = Annotated[Deps, Depends(get_deps)]


def create_app(
    settings: Settings | None = None,
    providers: Providers | None = None,
    corpus: CorpusStore | None = None,
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        corpus_store = corpus
        corpus_error = None
        if corpus_store is None:
            try:
                corpus_store = SqliteCorpusStore(settings.corpus_db_path)
            except FileNotFoundError as exc:
                corpus_error = str(exc)
        app.state.corpus_error = corpus_error
        app.state.deps = (
            Deps(
                settings=settings,
                corpus=corpus_store,
                state=SqliteStateStore(settings.state_db_path),
                providers=providers or build_providers(settings),
            )
            if corpus_store is not None
            else None
        )
        yield

    app = FastAPI(title="highnet-rag", version="0.1.0", lifespan=lifespan, docs_url="/api/docs")
    if settings.cors_origin_list or settings.cors_origin_regex:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_origin_regex=settings.cors_origin_regex,
            allow_methods=["GET"],
        )

    @app.get("/api/health")
    def health(request: Request) -> dict[str, object]:
        deps: Deps | None = request.app.state.deps
        return {
            "ok": deps is not None,
            "corpus": deps.corpus.meta().get("build_id") if deps else None,
            "error": request.app.state.corpus_error,
        }

    @app.get("/api/config")
    def config(deps: DepsDep) -> dict[str, object]:
        p = deps.providers
        return {
            "modes": list(SUPPORTED_MODES),
            "default_mode": DEFAULT_MODE,
            "top_k": {"default": settings.default_top_k, "max": settings.max_top_k},
            "chunk_sets": [
                {"name": s.name, "target_tokens": s.target_tokens, "chunks": s.chunk_count}
                for s in deps.corpus.chunk_sets()
            ],
            "models": {
                "embed": {"provider": p.embedder.provider, "model": p.embedder.model},
                "answer": {"provider": p.answer.provider, "model": p.answer.model},
            },
            "illustrative": settings.fake_providers,
            "budget": budget_state(deps.state, settings).as_dict(),
            "corpus": deps.corpus.meta(),
            "max_query_chars": settings.max_query_chars,
        }

    @app.get("/api/corpus/map")
    def corpus_map(deps: DepsDep, chunk_set: str = "medium") -> JSONResponse:
        match = next((s for s in deps.corpus.chunk_sets() if s.name == chunk_set), None)
        if match is None:
            raise HTTPException(404, detail=f"Unknown chunk set {chunk_set!r}")
        points = deps.corpus.map_points(match.id)
        body = {
            "chunk_set": chunk_set,
            "explained_variance": deps.corpus.projection(match.id).explained_variance,
            "points": [[p.chunk_id, p.doc_id, round(p.x, 5), round(p.y, 5)] for p in points],
        }
        build = deps.corpus.meta().get("build_id", "")
        return JSONResponse(body, headers={"ETag": f'"{build}-{chunk_set}"'})

    @app.get("/api/chunks/{chunk_id}")
    def chunk(deps: DepsDep, chunk_id: int) -> dict[str, object]:
        found = deps.corpus.chunks([chunk_id])
        if not found:
            raise HTTPException(404, detail="Chunk not found")
        c = found[0]
        return {
            "id": c.id,
            "doc_id": c.doc_id,
            "doc_title": c.doc_title,
            "ord": c.ord,
            "text": c.text,
            "start_char": c.start_char,
            "end_char": c.end_char,
            "approx_tokens": c.approx_tokens,
        }

    @app.get("/api/query")
    async def query(
        request: Request,
        deps: DepsDep,
        q: Annotated[str, Query(min_length=1, max_length=500)],
        mode: Annotated[Mode, Query()] = DEFAULT_MODE,
        k: Annotated[int, Query(ge=1, le=10)] = 5,
        chunk_set: Annotated[str, Query()] = "medium",
    ) -> StreamingResponse:
        params = QueryParams(
            q=q.strip(), mode=mode, k=min(k, settings.max_top_k), chunk_set=chunk_set
        )
        ip_hash = hash_ip(client_ip(request), settings)
        return StreamingResponse(
            stream_run(params, deps, ip_hash),
            media_type="text/event-stream",
            headers=SSE_HEADERS,
        )

    async def stream_run(params: QueryParams, deps: Deps, ip_hash: str) -> AsyncIterator[str]:
        queue: asyncio.Queue[TraceEvent | AnswerDelta | RunDone | None] = asyncio.Queue()

        async def produce() -> None:
            try:
                async for item in run_classic(params, deps, ip_hash, new_run_id()):
                    await queue.put(item)
            finally:
                await queue.put(None)

        task = asyncio.create_task(produce())
        keepalive = settings.sse_keepalive_seconds
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=keepalive)
                except TimeoutError:
                    # Starlette cancels this generator when the client disconnects.
                    yield ": keep-alive\n\n"
                    continue
                if item is None:
                    break
                if isinstance(item, TraceEvent):
                    yield sse("trace", item.model_dump_json())
                elif isinstance(item, AnswerDelta):
                    yield sse("answer_delta", item.model_dump_json())
                else:
                    yield sse("done", item.model_dump_json())
        finally:
            task.cancel()

    @app.get("/api/evals")
    def evals() -> JSONResponse:
        path = settings.evals_results_path
        if not path.exists():
            raise HTTPException(404, detail="No eval results published yet.")
        return JSONResponse(json.loads(path.read_text(encoding="utf-8")))

    if settings.static_dir.is_dir():
        app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="web")

    return app


app = create_app()
