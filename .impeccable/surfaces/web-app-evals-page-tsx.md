---
version: 1
slug: 'web-app-evals-page-tsx'
primary_target: 'web/app/evals/page.tsx'
related_targets: ['web/components/evals']
---

# Surface: evals report (`/evals`)

Scope: the published offline eval run, read-only. Visitor mode: **Read**, with one Operate control (which measure the retrieval tables show).

- Audience and job: developers and recruiters checking whether the pipeline is any good, and which setting helps. The job is to see, with real numbers, that retrieval decides the answer and that the reranker earns its cost.
- Content: only `evals/results/latest.json`, copied in at build time. Nothing is typed in by hand; a section the run did not measure says "Not measured in this run" and why.
- Structure: Sheet 2 of the same computation pad. A lede and a one-line run record (date, corpus build, models actually called, cost), then one sheet per question the evals answer, each with its blue-pencil note in the margin (inline below `lg`): does the search find the answer (recall@k / MRR per chunk size × mode × reranker), does the answer stick to the passages, does the agent help, and what the run cost.
- Link-in: an answer on the pipeline page links to `/evals/?mode=&chunks=&rerank=` and the matching cell is marked "your settings" in blue wash.
- Constraints: static export; tables are real tables with captions and sr-only cell sentences; colour is never the only cue (reranked values use the rerank series colour and sit in their own labelled column).
