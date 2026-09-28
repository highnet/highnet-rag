#!/usr/bin/env bash
# After a deploy: if the API reports no corpus, or the corpus lacks one of CHUNK_SETS (or
# FORCE_CORPUS=true), build it with real Voyage embeddings and upload it to the volume.
# Needs uv, flyctl, jq and VOYAGE_API_KEY.
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
CHUNK_SETS="${CHUNK_SETS:-small,medium,large}"
BASE="https://$APP.fly.dev"
health="$(curl -fsS --retry 6 --retry-delay 5 --retry-all-errors "$BASE/api/health")"
echo "Health: $health"

missing=""
if [ "$(jq -r '.ok' <<<"$health")" = "true" ]; then
  have="$(curl -fsS --retry 3 --retry-delay 5 "$BASE/api/config" | jq -r '[.chunk_sets[].name] | join(",")')"
  for set in ${CHUNK_SETS//,/ }; do
    [[ ",$have," == *",$set,"* ]] || missing="$missing $set"
  done
  if [ -z "$missing" ] && [ "${FORCE_CORPUS:-false}" != "true" ]; then
    echo "Corpus $(jq -r '.corpus' <<<"$health") has every chunk set ($have); nothing to do."
    exit 0
  fi
  echo "Rebuilding: chunk sets present: $have; missing:${missing:- none (forced)}."
fi
if [ -z "${VOYAGE_API_KEY:-}" ]; then
  echo "::warning::No corpus on the volume and no VOYAGE_API_KEY to build one; skipping."
  exit 0
fi

uv sync --frozen --no-dev --package highnet-rag
uv run highnet-rag fetch-squad
# Small batches and patient retries fit Voyage's lowest rate tier (no payment method on file).
VOYAGE_MAX_RETRIES=8 VOYAGE_MAX_RETRY_WAIT_SECONDS=65 \
  uv run highnet-rag ingest --chunk-sets "$CHUNK_SETS" --batch-size 24   # prints the embedding cost
scripts/upload-corpus.sh data/corpus.sqlite
