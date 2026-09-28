# evals

Offline evaluation of the highnet-rag pipeline. Milestone 6 builds the full runner and the public dashboard (see `docs/MILESTONES.md`). Milestone 1 ships the retrieval metrics.

- `src/highnet_rag_evals/metrics.py`: recall@k and MRR. A chunk counts as relevant when it contains the gold answer's character span; ingestion keeps exact offsets so this can be computed.
- `golden/`: golden question sets (`squad_auto`, `owner`, `compound`), added in M6.
- `results/latest.json`: the published results the site renders. The site never shows a number that is not in this file.

Run the tests with `uv run pytest evals`.
