# highnet-rag

A transparent Retrieval-Augmented Generation (RAG) teaching tool. Ask a question about a small, fixed corpus and watch every step of the pipeline as it runs. Each step is written out like a line of a calculation, with its timing, tokens, cost, and a plain-language "Why this step?":

- embedding the question and placing it on a 2D map;
- vector search (BM25 and hybrid arrive in milestone 2);
- choosing the context;
- the exact prompt;
- the streamed answer and its citations.

> Status: milestone 1 (walking skeleton). See [docs/MILESTONES.md](docs/MILESTONES.md).

## Run it locally (no API keys needed)

Requirements: [uv](https://docs.astral.sh/uv/) and Node 22 (`.nvmrc`).

```bash
uv sync
uv run highnet-rag fetch-squad && uv run highnet-rag ingest --fake
(cd web && npm ci && npm run build)
FAKE_PROVIDERS=true uv run highnet-rag serve        # → http://localhost:8000
```

`--fake` and `FAKE_PROVIDERS=true` use deterministic offline stand-ins: hashed word vectors instead of Voyage embeddings, and an extractive "LLM" instead of Claude. The UI labels such runs as illustrative.

### With the real providers

```bash
cp .env.example .env              # set ANTHROPIC_API_KEY and VOYAGE_API_KEY
uv run highnet-rag ingest         # real Voyage embeddings; prints the cost (cents)
uv run highnet-rag serve
```

To work on the frontend with hot reload, add `DEV_CORS_ORIGIN=http://localhost:3000` to `.env`, run `uv run highnet-rag serve`, and run `NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev` in `web/`.

### Checks

```bash
uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest
cd web && npm run lint && npm run typecheck && npm test && npm run build
.claude/skills/impeccable/scripts/impeccable detect web/app web/components web/content
```

After changing `api/src/highnet_rag/trace.py`, regenerate the frontend types with `npm run gen:types` in `web/`.

## Deploy (Fly.io)

One app in `fra` on a `shared-cpu-1x` machine with 512MB, scaled to zero when idle. FastAPI serves the site and `/api` from the same origin.

```bash
fly apps create highnet-rag
fly volumes create rag_data --app highnet-rag --region fra --size 1
fly secrets set --app highnet-rag ANTHROPIC_API_KEY=... VOYAGE_API_KEY=... IP_HASH_SALT="$(openssl rand -hex 32)"
fly deploy
scripts/upload-corpus.sh data/corpus.sqlite        # built locally with real embeddings
```

Then:

1. **Continuous deploys:** create a deploy token with `fly tokens create deploy --app highnet-rag` and save it as the `FLY_API_TOKEN` repository secret on GitHub. From then on, every push to `main` runs the tests and then deploys (`.github/workflows/ci.yml`).
2. **Spend limits:** set monthly spend limits in the Anthropic and Voyage consoles to match `BUDGET_MONTHLY_USD` ($20). The app enforces the same cap on its own; the console limits are the backstop.

The corpus file is uploaded separately and is not part of the image. Rebuild and upload it whenever ingestion changes.

## Docs

- [Project brief](docs/PROJECT_BRIEF.md): decisions and scope
- [Architecture](docs/ARCHITECTURE.md): components, trace events, endpoints, schema, deployment
- [Milestones](docs/MILESTONES.md): the plan and acceptance criteria
- [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md): product and design context (Impeccable)
- [AGENTS.md](AGENTS.md): conventions for humans and coding agents

## Licence

Code: [MIT](LICENCE.md). Corpus: SQuAD 2.0 (Rajpurkar et al., 2018), Wikipedia text under CC BY-SA 4.0.
