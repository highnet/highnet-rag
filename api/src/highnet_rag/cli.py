"""`highnet-rag` command line: fetch-squad, ingest, record, schema, serve."""

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


def cmd_record(args: argparse.Namespace) -> None:
    from highnet_rag.pipeline.deps import Deps
    from highnet_rag.providers import build_providers
    from highnet_rag.recordings import RecorderState, record
    from highnet_rag.storage.base import DemoQuestion
    from highnet_rag.storage.sqlite import SqliteCorpusStore, SqliteRecordingStore

    settings = get_settings()
    if args.fake:
        settings = settings.model_copy(update={"fake_providers": True})
    rows = json.loads(Path(args.questions).read_text(encoding="utf-8"))
    questions = [DemoQuestion(r["id"], r["question"], r["compound"]) for r in rows]
    if args.only:
        questions = [q for q in questions if q.id in args.only.split(",")]
    deps = Deps(
        settings,
        SqliteCorpusStore(Path(args.corpus) if args.corpus else settings.corpus_db_path),
        RecorderState(),
        build_providers(settings),
    )
    store = SqliteRecordingStore(Path(args.out))
    report = asyncio.run(record(questions, deps, store, concurrency=args.concurrency))
    print(
        f"\nRecorded {report.recorded}, already there {report.skipped}, "
        f"failed {len(report.failed)}; model and embedding cost ${report.cost_usd:.4f}"
    )
    if report.failed:
        raise SystemExit(1)


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

    p = sub.add_parser("record", help="record the demo questions at every setting (resumable)")
    p.add_argument("--questions", default="recordings/questions.json")
    p.add_argument("--corpus", default="", help="corpus.sqlite (default: CORPUS_DB_PATH)")
    p.add_argument("--out", default="data/recordings.sqlite")
    p.add_argument("--only", default="", help="comma list of question ids")
    p.add_argument("--fake", action="store_true", help="offline providers; illustrative runs")
    p.add_argument("--concurrency", type=int, default=1, help="questions recorded side by side")
    p.set_defaults(func=cmd_record)

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
