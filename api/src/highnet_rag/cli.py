"""`highnet-rag` command line: fetch-squad, ingest, schema, serve."""

import argparse
import asyncio
import json
import urllib.request
from pathlib import Path

from highnet_rag.config import get_settings


def cmd_fetch_squad(args: argparse.Namespace) -> None:
    from highnet_rag.ingest.squad import SQUAD_DEV_URL

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {SQUAD_DEV_URL} -> {out}")
    with urllib.request.urlopen(SQUAD_DEV_URL, timeout=60) as response:
        out.write_bytes(response.read())
    print(f"Saved {out.stat().st_size:,} bytes.")


def cmd_ingest(args: argparse.Namespace) -> None:
    from highnet_rag.ingest.build import build_corpus
    from highnet_rag.ingest.squad import load_squad
    from highnet_rag.providers import build_providers

    settings = get_settings()
    if args.fake:
        settings = settings.model_copy(update={"fake_providers": True})
    articles = load_squad(Path(args.source))
    if args.limit:
        articles = articles[: args.limit]
    embedder = build_providers(settings).embedder
    sets = [s.strip() for s in args.chunk_sets.split(",") if s.strip()]
    report = asyncio.run(
        build_corpus(articles, Path(args.out), embedder, settings, sets, batch_size=args.batch_size)
    )
    print(f"\nBuilt {args.out} (build {report.build_id}) from {report.documents} articles")
    for s in report.sets:
        pc1, pc2 = s.explained_variance
        print(
            f"  {s.name:>6}: {s.chunks:5} chunks, {s.embed_tokens:,} embedding tokens, "
            f"${s.cost_usd:.4f}, PCA explains {pc1:.1%} + {pc2:.1%}"
        )
    print(f"  total embedding cost: ${report.cost_usd:.4f} ({report.embed_model})")


def cmd_schema(args: argparse.Namespace) -> None:
    from pydantic.json_schema import models_json_schema

    from highnet_rag.trace import AnswerDelta, RunDone, TraceEvent

    _, schema = models_json_schema(
        [(TraceEvent, "serialization"), (AnswerDelta, "serialization"), (RunDone, "serialization")],
        title="highnet-rag trace events",
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


def cmd_serve(args: argparse.Namespace) -> None:
    import uvicorn

    uvicorn.run("highnet_rag.app:app", host=args.host, port=args.port, reload=args.reload)


def main() -> None:
    parser = argparse.ArgumentParser(prog="highnet-rag")
    sub = parser.add_subparsers(required=True)

    p = sub.add_parser("fetch-squad", help="download the SQuAD 2.0 dev set")
    p.add_argument("--out", default="data/squad/dev-v2.0.json")
    p.set_defaults(func=cmd_fetch_squad)

    p = sub.add_parser("ingest", help="build corpus.sqlite: load, chunk, embed, store, PCA")
    p.add_argument("--source", default="data/squad/dev-v2.0.json")
    p.add_argument("--out", default="data/corpus.sqlite")
    p.add_argument(
        "--chunk-sets", default="small,medium,large", help="comma list of small,medium,large"
    )
    p.add_argument("--limit", type=int, default=0, help="only the first N articles (testing)")
    p.add_argument("--batch-size", type=int, default=128, help="texts per embedding request")
    p.add_argument("--fake", action="store_true", help="offline hashed embeddings, no API cost")
    p.set_defaults(func=cmd_ingest)

    p = sub.add_parser("schema", help="export trace-event JSON Schema for the frontend")
    p.add_argument("--out", default="web/lib/generated/trace.schema.json")
    p.set_defaults(func=cmd_schema)

    p = sub.add_parser("serve", help="run the API (and the exported site, if built)")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--reload", action="store_true")
    p.set_defaults(func=cmd_serve)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
