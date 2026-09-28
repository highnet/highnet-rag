# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Fixed by the owner (see `docs/PROJECT_BRIEF.md`): Next.js App Router + TypeScript as a static export, Tailwind CSS v4, shadcn/ui primitives restyled to DESIGN.md; FastAPI (Python, uv) serves the export and the API from one origin on one Fly.io machine. Claude via the Anthropic Python SDK; Voyage for embeddings and reranking; SQLite (sqlite-vec + FTS5).

## Users

1. **Developers learning RAG** (primary). They know how to code and have heard of embeddings, but have not seen a real pipeline laid open. They arrive from a link or a portfolio, type a question, and want to see what actually happens between the question and the answer, and to change a setting and see how the result changes.
2. **Recruiters and hiring managers.** They skim for a few minutes to judge whether the author understands RAG well enough to build and explain it. They need the pipeline to be legible without reading code.
3. **Non-technical visitors.** Curious about "how AI answers questions from documents". They follow the plain-language layer and the answer; the technical layer is optional for them.
4. **The author** uses it as a personal lab for trying retrieval ideas; that is a side benefit, not a design driver.

Explanation depth targets an intermediate reader: basic programming and ML vocabulary is assumed. Each step has a short "Why this step?" and an expandable technical layer.

## Product Purpose

highnet-rag answers questions about a small, fixed English corpus using Retrieval-Augmented Generation. Every stage of the pipeline is streamed to the page as it runs, and each one can be inspected: chunking, embedding, BM25 and vector search, fusion, reranking, the exact prompt, tokens and cost, the agent's steps, and the cited answer.

The one idea a visitor should leave with: **the answer is only as good as what was retrieved.** RAG is search plus a prompt, and the visitor can see exactly which chunks the model was given.

Success means a developer can explain, after about five minutes, why a given answer was right or wrong by pointing at the retrieval stage. A recruiter can also see that the author understands the trade-offs.

## Positioning

Most RAG demos show only a chat box. highnet-rag treats the trace as the product: one trace event per stage, emitted as it happens, with real scores, token counts and cost for this exact query. The same query can be re-run with different settings (retrieval mode, top-k, reranker, chunk size, agentic mode), and the effect of each change shows up stage by stage.

## Operating Context

- Visitors reach it on a phone or a laptop from a portfolio link, GitHub, or a shared URL. They usually stay a few minutes and ask 1–5 questions.
- The corpus is curated and read-only: the 35 Wikipedia articles of the SQuAD 2.0 dev set (CC BY-SA 4.0), indexed ahead of time at several chunk sizes. Visitors never upload content.
- Live queries run against paid APIs under a monthly budget with a hard stop. When the budget or rate limit is hit, the page must say so plainly and still let visitors explore.
- An offline evaluation run publishes retrieval and faithfulness metrics that the site displays.

## Capabilities and Constraints

- Visitor controls: top-k; retrieval mode (BM25, vector, hybrid via reciprocal rank fusion); reranker on/off; chunk size (from prebuilt sizes); agentic mode (query rewriting plus multi-step search).
- Visible stages: query embedding placed on a 2D PCA map of the corpus; BM25 and vector results side by side with their fusion; the ranking before and after reranking; the exact prompt with token counts and cost; the agent's plan, rewrites and searches; the answer with citations that link back to chunks.
- Terminology used in the UI: _chunk_, _embedding_, _BM25_, _vector search_, _hybrid / fusion (RRF)_, _rerank_, _top-k_, _context window_, _citation_, _trace_.
- Out of scope for v1: accounts and login, uploads, saved history, languages other than English, other corpora, a "RAG off vs on" comparison, a failure gallery, Postgres, more than one region, and local ML models.
- UI copy is English only in v1, kept in one message catalogue so other languages can be added later.

## Brand Commitments

- Name: **highnet-rag** (lowercase, as written).
- Voice: a precise lab partner. Plain and exact, in the first-person plural ("we embed the query…"), with no hype. It names trade-offs and says when a step failed or was weak. Numbers beat adjectives.
- Visually independent of the author's portfolio (highnet.at); only a text link back.
- The owner pinned the visual direction as a "calm lab notebook". DESIGN.md records it.

## Evidence on Hand

- Corpus: the SQuAD 2.0 dev set: 35 articles, ~1.2k paragraphs, gold answers, and deliberately unanswerable questions. CC BY-SA 4.0; attribution must appear in the app.
- No testimonials, users, benchmarks or metrics exist yet. Eval numbers may only be shown once `/evals` has produced them. Never invent scores, costs or latencies; every number on the page comes from a real trace or eval run.

## Product Principles

1. **If a stage runs, it emits a trace event.** Nothing happens off-screen, including retries, fallbacks, and budget or rate-limit decisions.
2. **Show the evidence, then the answer.** Retrieved chunks and their scores are shown next to the answer, not hidden behind it.
3. **Every number is real.** Scores, tokens, cost and latency come from this query. Illustrative content is labeled as such.
4. **Honest about limits.** Say when retrieval was weak, when the question is unanswerable from the corpus, and when the budget has run out.
5. **One change, visible effect.** Every setting a visitor can change produces a difference they can see in the trace.

## Accessibility & Inclusion

WCAG 2.2 AA:

- The whole pipeline is keyboard-operable.
- Streamed stage updates are announced through a polite live region, without flooding screen readers.
- The 2D map has an equivalent table or list.
- Charts and scores never rely on colour alone.
- Motion respects `prefers-reduced-motion`.
- Light and dark themes both meet AA contrast.
- The layout is mobile-first and usable at 320px.
