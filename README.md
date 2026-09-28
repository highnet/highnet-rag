# highnet-rag

A transparent Retrieval-Augmented Generation (RAG) teaching tool. Ask a question about a small, fixed corpus and watch every step of the pipeline as it runs: chunking, embeddings on a 2D map, BM25 vs vector search, fusion, reranking, the exact prompt with tokens and cost, an optional agentic multi-step search, and the answer with citations.

> Status: planning. Application code starts with milestone 1 (see [docs/MILESTONES.md](docs/MILESTONES.md)).

## Docs

- [Project brief](docs/PROJECT_BRIEF.md): decisions and scope
- [Architecture](docs/ARCHITECTURE.md): components, trace events, endpoints, schema, deployment
- [Milestones](docs/MILESTONES.md): the plan, with acceptance criteria
- [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md): product and design context (Impeccable)
- [AGENTS.md](AGENTS.md): conventions for humans and coding agents

## Licence

Code: [MIT](LICENCE.md). Corpus: SQuAD 2.0 (Rajpurkar et al.), CC BY-SA 4.0.
