# syntax=docker/dockerfile:1

# API only: the web app is deployed separately on Vercel and calls this API cross-origin.
# --- Python runtime: FastAPI + uv ------------------------------------------------------------
FROM python:3.12-slim AS runtime
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PYTHONUNBUFFERED=1
WORKDIR /app

# Dependencies first (cached), then the package itself.
COPY pyproject.toml uv.lock .python-version ./
COPY api/pyproject.toml api/pyproject.toml
COPY evals/pyproject.toml evals/pyproject.toml
RUN uv sync --frozen --no-dev --package highnet-rag --no-install-workspace
COPY api/ api/
RUN uv sync --frozen --no-dev --package highnet-rag

COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN useradd --create-home --uid 1000 app && chmod +x /usr/local/bin/docker-entrypoint.sh

ENV PATH=/app/.venv/bin:$PATH \
    CORPUS_DB_PATH=/data/corpus.sqlite \
    STATE_DB_PATH=/data/state.sqlite
EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "highnet_rag.app:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
