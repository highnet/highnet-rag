# highnet-rag

A transparent Retrieval-Augmented Generation (RAG) teaching tool. Ask a question about a small, fixed corpus and watch every step of the pipeline as it runs. Each step is written out like a line of a calculation, with its timing, tokens, cost, and a plain-language "Why this step?":

- embedding the question and placing it on a 2D map;
- BM25 keyword search, vector search, and hybrid search that fuses the two (reciprocal rank fusion);
- choosing the context;
- the exact prompt;
- the streamed answer and its citations.

> Status: milestone 5 (agentic retrieval). See [docs/MILESTONES.md](docs/MILESTONES.md) and the changelog below.

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

To work on the frontend with hot reload, keep `CORS_ORIGINS=http://localhost:3000` in `.env`, run `uv run highnet-rag serve`, and run `NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev` in `web/`.

### Checks

```bash
uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest
cd web && npm run lint && npm run typecheck && npm test && npm run build
.claude/skills/impeccable/scripts/impeccable detect web/app web/components web/content
```

After changing `api/src/highnet_rag/trace.py`, regenerate the frontend types with `npm run gen:types` in `web/`.

## Deploy

The web app is on **Vercel**; the API is on **Fly.io** (`fra`, `shared-cpu-1x`, 512MB, scaled to zero).

### API (Fly.io), provisioned by CI

Fly is driven entirely from GitHub Actions; no local `flyctl` is needed. Add these **repository secrets**:

| Secret              | What                                          |
| ------------------- | --------------------------------------------- |
| `FLY_API_TOKEN`     | a Fly **org** token (`fly tokens create org`) |
| `ANTHROPIC_API_KEY` | Claude API key                                |
| `VOYAGE_API_KEY`    | Voyage key (also used to build the corpus)    |

Optionally, set the **repository variable** `FLY_ORG` to your org slug; the default is the token's first org.

On every push to `main`, the `deploy-api` job does three things:

1. `scripts/fly-provision.sh` creates the `highnet-rag` app and the `rag_data` volume in `fra` if they are missing, and stages the secrets. It generates `IP_HASH_SALT` once.
2. `flyctl deploy --remote-only`.
3. `scripts/fly-ensure-corpus.sh`: if `/api/health` reports no corpus, it builds one with real Voyage embeddings (a few cents at most) and uploads it to the volume.

To rebuild the corpus later, run the CI workflow manually on `main` with **rebuild_corpus** checked.

### Web (Vercel)

The Vercel project `highnet-rag` (team "highnet's projects") is linked to this repository with Root Directory `web`, Node 22, and `NEXT_PUBLIC_API_BASE=https://highnet-rag.fly.dev` for Production and Preview. Pushes to `main` deploy to production; other branches get preview URLs. The API accepts the production domain and previews through `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` in `fly.toml`.

### CI and spend limits

- Every push to `main` runs the tests (100% coverage) and then deploys the API (`.github/workflows/ci.yml`).
- Set monthly spend limits in the Anthropic and Voyage consoles to match `BUDGET_MONTHLY_USD` ($20). The app enforces the same cap itself; the console limits are the backstop.

## Docs

- [Project brief](docs/PROJECT_BRIEF.md): decisions and scope
- [Architecture](docs/ARCHITECTURE.md): components, trace events, endpoints, schema, deployment
- [Milestones](docs/MILESTONES.md): the plan and acceptance criteria
- [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md): product and design context (Impeccable)
- [AGENTS.md](AGENTS.md): conventions for humans and coding agents

## Changelog

- **Pre-recorded questions only.** Visitors pick from 15 questions, each recorded once with the real models at every setting, and the page replays the recorded run: every number is real, and a visit calls no model and costs nothing. Changing a setting replays that setting's own run. `LIVE_QUERIES=true` brings free-text questions back.
- **Corpus page and formulas.** `/corpus` shows every article with its chunk boundaries at each size. Each step now has one line of relational algebra; tap a symbol for its definition. Retrieval eval results (recall@k, MRR for all 18 configurations) are published on `/evals`.
- **The whole pipeline, drawn.** The top of the page now shows a diagram of the system: the corpus built ahead of time, then every step a question takes, linked to its step below and filling in as the run streams.
- **Evals (milestone 6, part 2).** A new `/evals` page shows recall@1/3/5/10 and MRR for every search mode, chunk size and reranker setting, measured offline over 105 SQuAD questions with known answers. Answer quality is marked as not measured until a full run is paid for. An answer on the pipeline page links to its own configuration's row.
- **Explanations up front.** The page opens with a short paragraph on what the site does, and every step opens with a plain-language paragraph: what the step does, why RAG needs it, and what to look for in its figure. The technical layer stays one click away under "Under the hood".
- **Milestone 5: agentic retrieval.** Switch the agent on and ask a question that joins two articles (ten suggestions are offered). Claude states a plan, writes one search per fact, runs each through the full retrieval pipeline, reads the results and decides whether to search again or answer. Each search is a numbered sub-step (3a, 3b, …) with its own stages, tokens and cost; the caps on searches and tokens are drawn as meters, and any cap that stops the loop says so.
- **Milestone 4: reranking and the corpus map.** Switch the reranker on and a cross-encoder rescores every candidate against the question; the list settles as rows slide from their old ranks to their new ones, with each move labelled. The map step now draws the whole chunk set on its two PCA axes with your question dropped in, the retrieved passages marked by rank, and the article under your pointer lit up. A table carries the same positions.
- **Milestone 3: visual aids.** Every step now has a small figure drawn from the run's own numbers: rate-limit and budget meters, the question vector as bars, BM25 term weights, distances on a number line with a zoom, fusion contributions as stacked bars, the context by passage, how much of the context window the prompt fills, the answer's cost split, and a grid of which passage backs which part of the answer. Each has a one-line "how to read this" caption and a text alternative with the same numbers.
- **Milestone 2: hybrid retrieval and the settings strip.** Run the same question in BM25, vector and hybrid modes. The BM25 step shows the exact FTS5 MATCH string. The fusion step shows the two rankings side by side, then the fused list with each passage's rank in both inputs and its reciprocal-rank-fusion score, cut at top-k. Mode, top-k and chunk size (small, medium, large) sit in a settings strip; they and the question live in the URL, so a run can be shared by link. The background grid is gone; the pad is plain paper.
- **Milestone 1: walking skeleton.** One question, fully traced and live: embed, vector search, context, prompt, a streamed answer with citations, each step with its "Why this step?", timing, tokens, cost and the code that ran.

## Licence

Code: [MIT](LICENCE.md). Corpus: SQuAD 2.0 (Rajpurkar et al., 2018), Wikipedia text under CC BY-SA 4.0.
