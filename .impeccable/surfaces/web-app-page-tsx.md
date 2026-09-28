---
version: 1
slug: 'web-app-page-tsx'
primary_target: 'web/app/page.tsx'
related_targets: []
---

# Surface: pipeline explorer (home, `/`)

Scope: the single main surface. Ask a question, watch the pipeline work it out step by step, inspect any step, change a setting and run it again. Visitor mode: **Operate**, with a Read layer (the "Why this step?" notes).

- Audience and job: developers learning RAG, then recruiters (see PRODUCT.md). The job is to understand why this answer came out of this retrieval.
- Action: pick a recorded question → read the replayed steps and the answer → change one setting (it replays that setting's own recorded run). Free-text questions answered live return only with `LIVE_QUERIES=true`.
- Proof and content: real trace events for this exact query, plus the SQuAD 2.0 corpus (CC BY-SA 4.0, attributed in the footer).
- Constraints: static export; SSE stream; mobile-first; WCAG 2.2 AA; budget and rate-limit states must be visible.
- Memorable moment: the query's point landing on the 2D corpus map among its nearest chunks, then the ranked lists settling as reranking flips rows into place.

## Direction contract

THESIS: A query is a calculation worked out on an engineer's computation pad. It refuses the category default of a chat bubble with a hidden "sources" drawer: here the working is the page, and the answer is the last line.

OWN-WORLD: The ground is plain pale-green engineering paper (no grid pattern; owner decision). Graphite ink carries every fact and number. Blue pencil is the only accent, used for margin notes, the active step and actions; red check marks mean failure only. Recursive: linear sans for prose, casual and slanted for pencil notes, mono with tabular figures for data. Lines are 1px, corners 2–4px, and nothing has a shadow. In the dark theme the same pad sits under a drafting lamp.

STORY: The visitor sees that retrieval decides the answer, believes the numbers because they are live, and changes one knob to watch which step moves.

FIRST VIEWPORT: Owner decisions (2026-09-28, in the owner's words: "add a top level explanation of what the website does" and "draw a pipeline diagram of the whole thing too at the top"): the page opens with the site's explanation, then the pipeline diagram of the whole system (folded formulas key beneath it). Below them sits the sheet, "Sheet 1 · <question>", then the replay notice, the "Pick a question" picker (one-article and two-article groups, folded to three each), and the settings strip; the numbered step placeholders follow. On phones the explanation and diagram come first, so the picker is one scroll down; that trade is the owner's.

FORM: engineer's computation pad, position 6 of 7 on the grounded list; seed key cfb983fc. Raises: from split-flap board, ranked lists keep fixed columns and only values move when reranking; from one-bit desktop, states are carried by pattern and weight, not colour alone.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: each step is written into the pad as its SSE event arrives. The step number, then its values, then its blue-pencil note, in about 180ms; with reduced motion it appears instantly.

## Unresolved

- Settled: agentic searches nest inside one "Search, step by step" sheet, numbered 3a, 3b, ... (owner).
