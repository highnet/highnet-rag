"""`highnet-rag-evals` command line: build-golden, run, schema."""

import argparse
import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path

from highnet_rag.config import get_settings

GOLDEN_DIR = Path("evals/golden")
RESULTS_DIR = Path("evals/results")


def cmd_build_golden(args: argparse.Namespace) -> None:
    from highnet_rag.ingest.squad import load_squad
    from highnet_rag_evals.golden import build_squad_auto, write_jsonl

    rows = build_squad_auto(load_squad(Path(args.source)))
    out = Path(args.out) / "squad_auto.jsonl"
    write_jsonl(out, rows)
    answerable = sum(r.answerable for r in rows)
    print(f"Wrote {out}: {len(rows)} questions ({answerable} answerable).")


def cmd_run(args: argparse.Namespace) -> None:
    from highnet_rag.providers import build_providers
    from highnet_rag.storage.sqlite import SqliteCorpusStore
    from highnet_rag_evals.golden import load_golden
    from highnet_rag_evals.judge import build_judge
    from highnet_rag_evals.runner import Evaluator

    settings = get_settings()
    if args.fake:
        settings = settings.model_copy(update={"fake_providers": True})
    corpus_path = Path(args.corpus) if args.corpus else settings.corpus_db_path
    golden = load_golden(Path(args.golden))
    if args.limit:
        golden = golden.model_copy(
            update={
                "squad_auto": golden.squad_auto[: args.limit],
                "owner": golden.owner[: args.limit],
                "compound": golden.compound[: args.limit],
            }
        )
    evaluator = Evaluator(
        settings,
        SqliteCorpusStore(corpus_path),
        build_providers(settings),
        build_judge(settings),
        concurrency=args.concurrency,
    )
    results = asyncio.run(evaluator.run(golden, retrieval_only=args.retrieval_only))

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    body = results.model_dump_json(indent=2) + "\n"
    day = datetime.now(UTC).strftime("%Y-%m-%d")
    (out / "latest.json").write_text(body, encoding="utf-8")
    (out / f"{day}.json").write_text(body, encoding="utf-8")
    details = "".join(json.dumps(d, ensure_ascii=False) + "\n" for d in evaluator.details)
    (out / f"{day}.details.jsonl").write_text(details, encoding="utf-8")
    print(f"\nWrote {out / 'latest.json'}, {day}.json and {day}.details.jsonl")
    for line in results.cost.by_model:
        print(
            f"  {line.provider}/{line.model}: {line.calls} calls, {line.input_tokens:,} in, "
            f"{line.output_tokens:,} out, ${line.cost_usd:.4f}"
        )
    print(f"  eval run cost: ${results.cost.total_usd:.4f} in {results.run.duration_s:.0f}s")


def cmd_schema(args: argparse.Namespace) -> None:
    from highnet_rag_evals.results import EvalResults

    schema = EvalResults.model_json_schema(mode="serialization")
    schema["title"] = "highnet-rag eval results"
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="highnet-rag-evals")
    sub = parser.add_subparsers(required=True)

    p = sub.add_parser("build-golden", help="pick the squad_auto questions from SQuAD dev")
    p.add_argument("--source", default="data/squad/dev-v2.0.json")
    p.add_argument("--out", default=str(GOLDEN_DIR))
    p.set_defaults(func=cmd_build_golden)

    p = sub.add_parser("run", help="run the evals and write results/latest.json")
    p.add_argument("--golden", default=str(GOLDEN_DIR))
    p.add_argument("--corpus", default="", help="corpus.sqlite (default: CORPUS_DB_PATH)")
    p.add_argument("--out", default=str(RESULTS_DIR))
    p.add_argument("--fake", action="store_true", help="offline providers; illustrative numbers")
    p.add_argument("--limit", type=int, default=0, help="only the first N questions per set")
    p.add_argument("--concurrency", type=int, default=6)
    p.add_argument(
        "--retrieval-only",
        action="store_true",
        help="recall@k and MRR only: no answers, no judge (Voyage calls only, a few cents)",
    )
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("schema", help="export the results JSON Schema for the frontend")
    p.add_argument("--out", default="web/lib/generated/evals.schema.json")
    p.set_defaults(func=cmd_schema)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
