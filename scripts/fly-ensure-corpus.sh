#!/usr/bin/env bash
# After a deploy: if the API reports no corpus (or FORCE_CORPUS=true), build it with real
# Voyage embeddings and upload it to the volume. Needs uv, flyctl and VOYAGE_API_KEY.
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
health="$(curl -fsS --retry 6 --retry-delay 5 --retry-all-errors "https://$APP.fly.dev/api/health")"
echo "Health: $health"

if [ "$(jq -r '.ok' <<<"$health")" = "true" ] && [ "${FORCE_CORPUS:-false}" != "true" ]; then
  echo "Corpus $(jq -r '.corpus' <<<"$health") is loaded; nothing to do."
  exit 0
fi
if [ -z "${VOYAGE_API_KEY:-}" ]; then
  echo "::warning::No corpus on the volume and no VOYAGE_API_KEY to build one; skipping."
  exit 0
fi

uv sync --frozen --no-dev --package highnet-rag
uv run highnet-rag fetch-squad
# Small batches and patient retries fit Voyage's lowest rate tier (no payment method on file).
VOYAGE_MAX_RETRIES=8 VOYAGE_MAX_RETRY_WAIT_SECONDS=65 \
  uv run highnet-rag ingest --chunk-sets medium --batch-size 24   # prints the embedding cost
scripts/upload-corpus.sh data/corpus.sqlite
