# highnet-rag — Milestones

There is no deadline; each milestone ships when its acceptance criteria pass. Every milestone ends with:

- CI green, the API deployed to Fly and the web app to Vercel;
- a short demo note in the README changelog;
- for UI work, Impeccable `audit` and `polish` passes with **zero detector findings**.

## M1 · Walking skeleton: one question, fully traced, live

**Demo:** open the Vercel URL on a phone, ask "What is the Norman conquest?" and watch the steps being filled in (embed → vector search → context → prompt → answer with citations), each with its "Why this step?", ms, tokens and cost.

Acceptance criteria:

- [ ] Layout in place: `/web`, `/api`, `/evals`, `/docs`, `Dockerfile`, `fly.toml`, `.env.example` listing every variable, and no hard-coded keys.
- [ ] `highnet-rag ingest` builds `corpus.sqlite` from SQuAD 2.0 dev: load → chunk (`medium` set) → Voyage embed → store (FTS5 table created, sqlite-vec index) → PCA fitted and stored, with chunk metadata (doc, order, char offsets, tokens, x/y).
- [ ] `GET /api/query` streams SSE: one `trace` event per stage (`request`, `embed_query`, `map_project`, `vector`, `select_context`, `prompt`, `generate`, `citations`), then `done`. Stages not built yet emit `skipped` with a reason.
- [ ] A Pydantic `TraceEvent` with the fields from ARCHITECTURE §4; the JSON Schema is exported and the TS types generated.
- [ ] Budget and rate limiting are live from day one: spend ledger, $20 hard stop, 20/min and 200/day per IP, all visible in the `request` stage.
- [ ] The frontend pipeline view renders trace events as live step cards, each with a plain-language "Why this step?", following DESIGN.md (the computation pad) in light and dark themes, mobile-first.
- [ ] shadcn primitives are restyled and renamed per AGENTS.md; `Button` and `Typography` CVA components exist.
- [ ] Tests: pytest (chunking, PCA projection, tracer, SSE endpoint with fake providers, budget stop) and a Vitest smoke test (SSE fixture → every stage renders).
- [ ] GitHub Action: test (100% coverage), then `fly deploy` of the API on push to `main`; the web app deploys through Vercel's GitHub integration.
- [ ] Every step has a collapsible live code excerpt, extracted from the Python source at build time and highlighted with highlight.js.
- [ ] On phones, steps fold to one-line rows so a full run stays short.
- [ ] README: local setup in under 5 commands, plus deploy steps.
- [ ] Impeccable finish: audit and polish, zero detector findings, and DESIGN.md re-documented from the built UI (the seed marker removed).

## M2 · Hybrid retrieval and the settings strip

**Demo:** run the same question in BM25, vector and hybrid modes. The two ranked lists sit side by side, the RRF fusion shows where each chunk came from, and changing the chunk size (small/medium/large) visibly changes what is retrieved.

Acceptance criteria:

- [ ] Ingest builds all three chunk sets. FTS5 BM25 search is filtered by chunk set, and `bm25` shows the exact MATCH string.
- [ ] `fuse` implements RRF (k = 60) with per-chunk contributions.
- [ ] Settings strip: mode, top-k (1–10), chunk size. On phones it is a drawer; state is kept in the URL, so traces can be shared by link.
- [ ] `RankTable` shows the BM25 and vector columns side by side at ≥ `lg`, and stacked below that. Rank badges use data colours plus marker shapes.
- [ ] Changing any setting and re-running changes the trace (tested).

## M3 · Reranking and the corpus map

**Demo:** turn the reranker on; the rank table settles as rows move into their reranked positions, with the up/down deltas labelled. The 2D map shows the corpus, and the query's point lands among its nearest chunks.

Acceptance criteria:

- [ ] The `rerank` stage (Voyage `rerank-2.5-lite`) emits before/after lists with relevance scores and the rank changes.
- [ ] `/api/corpus/map` plus a `CorpusMap` canvas: points coloured by document, retrieved chunks highlighted, the query projected with the stored PCA, the explained variance shown honestly.
- [ ] The map has a keyboard-accessible table alternative; the phone presentation is decided and built.
- [ ] Reduced motion: rank changes appear without animation.

## M4 · Agentic retrieval

**Demo:** ask a compound question ("Which came first, the founding of … or …?"). The agent plans, rewrites the question into sub-queries, searches twice, and answers with citations from both articles. Every tool call is a numbered sub-step (4a, 4b, …).

Acceptance criteria:

- [ ] Manual Claude tool-use loop with `search` and `answer` tools. `agent_plan` and `agent_step` stages each carry `parent`; the loop is capped by `AGENT_MAX_STEPS` and a token cap, and both caps are visible in the trace.
- [ ] Agentic mode is disabled in the `degraded` budget tier, with an explanation.
- [ ] About 10 compound demo questions are written, reviewed by the owner, and offered as suggestions in agentic mode.
- [ ] Tests: the agent loop with a scripted fake Claude (multi-step, max-steps cutoff, tool error).

## M5 · Evals dashboard and finish

**Demo:** `/evals` shows recall@k and MRR for each retrieval mode, chunk size and rerank setting, faithfulness, and the abstention rate on unanswerable questions, with the run date and the cost of the eval run. The pipeline page links "how good is this configuration?" to the matching row.

Acceptance criteria:

- [ ] Golden sets: `squad_auto` (~150, auto-mapped), `owner` (~20, written by the owner), `compound` (~10).
- [ ] `uv run --package evals run` computes the metrics, writes `evals/results/latest.json` and a dated copy, and prints its cost.
- [ ] The `/evals` page renders only numbers present in the JSON, with methodology notes ("what recall@5 means").
- [ ] Full Impeccable finish on every page: critique, audit, polish, a finish-reviewer verdict of `ship`, and DESIGN.md current.
- [ ] Accessibility pass: keyboard-only walkthrough, screen-reader announcement check, AA contrast in both themes.
