#!/usr/bin/env bash
# Upload a locally built corpus.sqlite to the Fly volume and restart the app.
# Usage: scripts/upload-corpus.sh [path/to/corpus.sqlite]
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
FLY="$(command -v fly || command -v flyctl)"
SRC="${1:-data/corpus.sqlite}"

if [ ! -f "$SRC" ]; then
  echo "No corpus at $SRC. Build it first: uv run highnet-rag ingest" >&2
  exit 1
fi

echo "Waking $APP (machines scale to zero)..."
curl -fsS "https://$APP.fly.dev/api/health" >/dev/null || true

echo "Uploading $SRC -> /data/corpus.sqlite.new"
"$FLY" ssh console -a "$APP" -C "rm -f /data/corpus.sqlite.new"
echo "put $SRC /data/corpus.sqlite.new" | "$FLY" ssh sftp shell -a "$APP"

echo "Swapping it in atomically and restarting"
"$FLY" ssh console -a "$APP" -C "mv /data/corpus.sqlite.new /data/corpus.sqlite"
"$FLY" apps restart "$APP"

echo "Done. Check: curl https://$APP.fly.dev/api/health"
