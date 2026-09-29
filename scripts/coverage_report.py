"""Write the test-coverage report that the /coverage page renders.

Each CI job updates its own section of web/lib/generated/coverage.json from the reports its
test run just wrote, then fails if the committed file differs. So the page only ever shows
numbers from a real test run of the committed code. Standard library only, so it runs in the
web job without the uv environment.

    python3 scripts/coverage_report.py python --coverage coverage.json --junit junit.xml
    python3 scripts/coverage_report.py web --summary web/coverage/coverage-summary.json \\
        --tests web/coverage/tests.json

`scripts/gen-coverage.sh` runs both test suites and both commands.
"""

import argparse
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web/lib/generated/coverage.json"
# Python packages measured by pytest-cov, in page order: (name, source root).
PYTHON_PACKAGES = [("api", "api/src/highnet_rag"), ("evals", "evals/src/highnet_rag_evals")]


def counts(covered: int, total: int) -> dict[str, int]:
    return {"covered": covered, "total": total}


def totals(files: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    return {
        metric: counts(
            sum(f[metric]["covered"] for f in files), sum(f[metric]["total"] for f in files)
        )
        for metric in ("lines", "branches")
    }


def package(name: str, root: str, files: list[dict[str, Any]]) -> dict[str, Any]:
    # Files with nothing to run (an empty __init__.py, a types-only module) are counted, not listed.
    measured = sorted((f for f in files if f["lines"]["total"]), key=lambda f: f["path"])
    return {
        "name": name,
        "root": root,
        "totals": totals(measured),
        "empty_files": len(files) - len(measured),
        "files": measured,
    }


def python_section(coverage_json: Path, junit_xml: Path) -> dict[str, Any]:
    report = json.loads(coverage_json.read_text())
    grouped: dict[str, list[dict[str, Any]]] = {name: [] for name, _ in PYTHON_PACKAGES}
    for path, data in report["files"].items():
        rel = Path(path).resolve().relative_to(ROOT).as_posix()
        name, root = next((n, r) for n, r in PYTHON_PACKAGES if rel.startswith(f"{r}/"))
        s = data["summary"]
        grouped[name].append(
            {
                "path": rel.removeprefix(f"{root}/"),
                "lines": counts(s["covered_lines"], s["num_statements"]),
                "branches": counts(s["covered_branches"], s["num_branches"]),
            }
        )
    suite = ET.parse(junit_xml).getroot()
    suites = [suite] if suite.tag == "testsuite" else list(suite)
    tests = sum(int(s.get("tests", 0)) - int(s.get("skipped", 0)) for s in suites)
    return {
        "runner": "pytest + coverage.py",
        "tests": tests,
        "packages": [package(n, r, grouped[n]) for n, r in PYTHON_PACKAGES],
    }


def web_section(summary_json: Path, tests_json: Path) -> dict[str, Any]:
    summary = json.loads(summary_json.read_text())
    files = []
    for path, data in summary.items():
        if path == "total":
            continue
        rel = Path(path).resolve().relative_to(ROOT / "web").as_posix()
        files.append(
            {
                "path": rel,
                "lines": counts(data["lines"]["covered"], data["lines"]["total"]),
                "branches": counts(data["branches"]["covered"], data["branches"]["total"]),
            }
        )
    tests = json.loads(tests_json.read_text())
    return {
        "runner": "Vitest + V8",
        "tests": tests["numPassedTests"],
        "packages": [package("web", "web", files)],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Write the /coverage page's test-coverage report.")
    sub = parser.add_subparsers(dest="section", required=True)
    py = sub.add_parser("python")
    py.add_argument("--coverage", type=Path, required=True)
    py.add_argument("--junit", type=Path, required=True)
    web = sub.add_parser("web")
    web.add_argument("--summary", type=Path, required=True)
    web.add_argument("--tests", type=Path, required=True)
    args = parser.parse_args()

    report: dict[str, Any] = (
        json.loads(OUT.read_text()) if OUT.exists() else {"python": None, "web": None}
    )
    if args.section == "python":
        report["python"] = python_section(args.coverage, args.junit)
    else:
        report["web"] = web_section(args.summary, args.tests)
    OUT.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Wrote the {args.section} section of {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
