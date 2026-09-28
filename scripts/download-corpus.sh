#!/usr/bin/env bash
# Download the live corpus.sqlite from the Fly volume, so evals measure what visitors query.
# Usage: scripts/download-corpus.sh [path/to/corpus.sqlite]
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
FLY="$(command -v fly || command -v flyctl)"
OUT="${1:-data/corpus.sqlite}"

echo "Waking $APP (machines scale to zero)..."
curl -fsS --retry 6 --retry-delay 5 --retry-all-errors "https://$APP.fly.dev/api/health"
echo

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
echo "Downloading /data/corpus.sqlite -> $OUT"
"$FLY" ssh sftp get -a "$APP" /data/corpus.sqlite "$OUT"
ls -l "$OUT"
