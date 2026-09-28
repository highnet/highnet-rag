#!/usr/bin/env bash
# Upload a locally built corpus.sqlite to the Fly volume and restart the app.
# Usage: scripts/upload-corpus.sh [path/to/local.sqlite] [name on the volume, default corpus.sqlite]
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
# The file on the volume: corpus.sqlite by default, or e.g. recordings.sqlite.
NAME="${2:-corpus.sqlite}"
FLY="$(command -v fly || command -v flyctl)"
SRC="${1:-data/corpus.sqlite}"

if [ ! -f "$SRC" ]; then
  echo "No corpus at $SRC. Build it first: uv run highnet-rag ingest" >&2
  exit 1
fi

echo "Waking $APP (machines scale to zero)..."
curl -fsS "https://$APP.fly.dev/api/health" >/dev/null || true

echo "Uploading $SRC -> /data/$NAME.new"
"$FLY" ssh console -a "$APP" -C "rm -f /data/$NAME.new"
echo "put $SRC /data/$NAME.new" | "$FLY" ssh sftp shell -a "$APP"

echo "Swapping it in atomically and restarting"
"$FLY" ssh console -a "$APP" -C "mv /data/$NAME.new /data/$NAME"
"$FLY" apps restart "$APP"

echo "Done. Check: curl https://$APP.fly.dev/api/health"
