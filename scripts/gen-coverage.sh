#!/usr/bin/env bash
# Run every test suite with coverage and write web/lib/generated/coverage.json, the report the
# /coverage page renders. CI runs the same steps per job and fails if the committed file differs.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
uv run pytest -q --cov-report="json:$tmp/coverage.json" --junitxml="$tmp/junit.xml" > /dev/null
python3 scripts/coverage_report.py python --coverage "$tmp/coverage.json" --junit "$tmp/junit.xml"
(cd web && npx vitest run --coverage > /dev/null)
python3 scripts/coverage_report.py web --summary web/coverage/coverage-summary.json \
  --tests web/coverage/tests.json
