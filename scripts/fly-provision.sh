#!/usr/bin/env bash
# Idempotent Fly.io provisioning, run by CI before each deploy with an org token in
# FLY_API_TOKEN: creates the app and volume if missing and stages the secrets.
# Env: FLY_API_TOKEN (required), ANTHROPIC_API_KEY, VOYAGE_API_KEY, FLY_ORG (optional:
# defaults to the token's first org), FLY_APP (default highnet-rag), FLY_REGION (default fra).
set -euo pipefail

APP="${FLY_APP:-highnet-rag}"
REGION="${FLY_REGION:-fra}"
ORG="${FLY_ORG:-$(flyctl orgs list --json | jq -r 'keys[0]')}"

if flyctl status --app "$APP" >/dev/null 2>&1; then
  echo "App $APP exists."
else
  echo "Creating app $APP in org $ORG"
  flyctl apps create "$APP" --org "$ORG"
fi

if flyctl volumes list --app "$APP" --json | jq -e '.[] | select((.name // .Name) == "rag_data")' >/dev/null; then
  echo "Volume rag_data exists."
else
  echo "Creating volume rag_data in $REGION"
  flyctl volumes create rag_data --app "$APP" --region "$REGION" --size 1 --yes
fi

existing="$(flyctl secrets list --app "$APP" --json | jq -r '.[] | (.name // .Name)')"
secrets=()
[ -n "${ANTHROPIC_API_KEY:-}" ] && secrets+=("ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
[ -n "${VOYAGE_API_KEY:-}" ] && secrets+=("VOYAGE_API_KEY=$VOYAGE_API_KEY")
grep -qx IP_HASH_SALT <<<"$existing" || secrets+=("IP_HASH_SALT=$(openssl rand -hex 32)")
if [ "${#secrets[@]}" -gt 0 ]; then
  # --stage: applied by the deploy that follows, without an extra restart.
  flyctl secrets set --app "$APP" --stage "${secrets[@]}" >/dev/null
  echo "Staged ${#secrets[@]} secret(s)."
fi
for name in ANTHROPIC_API_KEY VOYAGE_API_KEY; do
  if [ -z "${!name:-}" ] && ! grep -qx "$name" <<<"$existing"; then
    echo "::warning::$name is not set: live queries will fail with a clear trace error until it is."
  fi
done
