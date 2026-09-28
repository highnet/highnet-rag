#!/usr/bin/env bash
# Download the live corpus.sqlite from the Fly volume, so evals measure what visitors query.
# Usage: scripts/download-corpus.sh [path/to/local.sqlite] [name on the volume, default corpus.sqlite]
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
# The file on the volume: corpus.sqlite by default, or e.g. recordings.sqlite.
NAME="${2:-corpus.sqlite}"
FLY="$(command -v fly || command -v flyctl)"
OUT="${1:-data/corpus.sqlite}"

echo "Waking $APP (machines scale to zero)..."
curl -fsS --retry 6 --retry-delay 5 --retry-all-errors "https://$APP.fly.dev/api/health"
echo

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
echo "Downloading /data/$NAME -> $OUT"
"$FLY" ssh sftp get -a "$APP" /data/$NAME "$OUT"
ls -l "$OUT"
