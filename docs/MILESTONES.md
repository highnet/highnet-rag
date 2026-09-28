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

- [x] Ingest builds all three chunk sets. FTS5 BM25 search is filtered by chunk set, and `bm25` shows the exact MATCH string.
- [x] `fuse` implements RRF (k = 60) with per-chunk contributions.
- [x] Settings strip: mode, top-k (1–10), chunk size. On phones it folds to a one-line summary (the "drawer"); state is kept in the URL, so traces can be shared by link.
- [x] `RankTable` shows the BM25 and vector columns side by side at ≥ `lg`, and stacked (folded) below that. Rank badges use data colours plus marker shapes.
- [x] Changing any setting and re-running changes the trace (tested).
- [x] The background grid is gone at the owner's request; the pad is plain paper.

## M3 · Visual aids: a picture for every step

**Why:** the numbers are all there after M2, but a newcomer still has to read tables to see what happened. Each step gets one small figure, drawn from this run's own trace, that shows the idea at a glance. The owner asked for this milestone.

**Demo:** run one question and, without reading code or tables, say what each step did: the question turning into a vector, which words BM25 matched and how much each weighed, where the passages fall on a distance line, how the two rankings fed the fused list, how full the context window is, and where the tokens and cents went.

Acceptance criteria:

- [x] Each step has one explanatory figure next to its numbers, built from the trace (no invented values; anything schematic is labelled schematic):
  - `request`: rate-limit and budget meters.
  - `embed_query`: the shown dimensions as a strip of signed values, with the norm.
  - `bm25`: the question with matched terms highlighted and each term's weight (IDF). The trace gains per-term document frequencies.
  - `map_project` keeps its coordinates until the drawn corpus map lands in M4.
  - `vector`: distances on a 0 to 1 number line, with the kept passages marked.
  - `fuse`: stacked contribution bars (BM25 part plus vector part) per fused passage, with the top-k cut.
  - `select_context` and `prompt`: a context-window bar split into system, passages and question tokens, against the model's window and the worst-case cost.
  - `generate` and `citations`: answer sentences linked to the passages they cite; uncited passages shown as unused.
- [x] Figures are SVG or HTML in DESIGN.md's data colours and marker shapes, have a text alternative carrying the same numbers, respect reduced motion, and fold with their step on phones, so a run stays short.
- [x] A one-line "how to read this" caption wherever a figure needs one.
- [x] Tests render every figure from fixture data; coverage stays at 100%; Impeccable finish with zero detector findings.

## M4 · Reranking and the corpus map

**Demo:** turn the reranker on; the rank table settles as rows move into their reranked positions, with the up/down deltas labelled. The 2D map shows the corpus, and the query's point lands among its nearest chunks.

Acceptance criteria:

- [ ] The `rerank` stage (Voyage `rerank-2.5-lite`) emits before/after lists with relevance scores and the rank changes.
- [ ] `/api/corpus/map` plus a `CorpusMap` canvas: points coloured by document, retrieved chunks highlighted, the query projected with the stored PCA, the explained variance shown honestly.
- [ ] The map has a keyboard-accessible table alternative; the phone presentation is decided and built.
- [ ] Reduced motion: rank changes appear without animation.

## M5 · Agentic retrieval

**Demo:** ask a compound question ("Which came first, the founding of … or …?"). The agent plans, rewrites the question into sub-queries, searches twice, and answers with citations from both articles. Every tool call is a numbered sub-step (4a, 4b, …).

Acceptance criteria:

- [ ] Manual Claude tool-use loop with `search` and `answer` tools. `agent_plan` and `agent_step` stages each carry `parent`; the loop is capped by `AGENT_MAX_STEPS` and a token cap, and both caps are visible in the trace.
- [ ] Agentic mode is disabled in the `degraded` budget tier, with an explanation.
- [ ] About 10 compound demo questions are written, reviewed by the owner, and offered as suggestions in agentic mode.
- [ ] Tests: the agent loop with a scripted fake Claude (multi-step, max-steps cutoff, tool error).

## M6 · Evals dashboard and finish

**Demo:** `/evals` shows recall@k and MRR for each retrieval mode, chunk size and rerank setting, faithfulness, and the abstention rate on unanswerable questions, with the run date and the cost of the eval run. The pipeline page links "how good is this configuration?" to the matching row.

Acceptance criteria:

- [ ] Golden sets: `squad_auto` (~150, auto-mapped), `owner` (~20, written by the owner), `compound` (~10).
- [ ] `uv run --package evals run` computes the metrics, writes `evals/results/latest.json` and a dated copy, and prints its cost.
- [ ] The `/evals` page renders only numbers present in the JSON, with methodology notes ("what recall@5 means").
- [ ] Full Impeccable finish on every page: critique, audit, polish, a finish-reviewer verdict of `ship`, and DESIGN.md current.
- [ ] Accessibility pass: keyboard-only walkthrough, screen-reader announcement check, AA contrast in both themes.
