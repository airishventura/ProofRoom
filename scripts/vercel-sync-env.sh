#!/usr/bin/env bash
# Push production-safe env vars to Vercel and redeploy.
# Usage: VERCEL_TOKEN=vcp_... ./scripts/vercel-sync-env.sh
set -euo pipefail

: "${VERCEL_TOKEN:?Set VERCEL_TOKEN first — https://vercel.com/account/tokens}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Auth..."
npx vercel whoami --token "$VERCEL_TOKEN"

echo "Link project..."
npx vercel link --yes --token "$VERCEL_TOKEN" --project proof-room 2>/dev/null \
  || npx vercel link --yes --token "$VERCEL_TOKEN"

add() {
  local key="$1" val="$2" env="${3:-production}"
  echo "→ $key ($env)"
  printf '%s' "$val" | npx vercel env rm "$key" "$env" --yes --token "$VERCEL_TOKEN" >/dev/null 2>&1 || true
  printf '%s' "$val" | npx vercel env add "$key" "$env" --token "$VERCEL_TOKEN"
}

# Site / frontend (static deploy on Vercel)
add PUBLIC_APP_URL "https://www.proofroom.site" production
add PUBLIC_APP_URL "https://www.proofroom.site" preview
add CORS_ORIGIN "https://www.proofroom.site,https://proofroom.site" production
add CORS_ORIGIN "https://www.proofroom.site,https://proofroom.site" preview
add NODE_ENV "production" production
add SEED_DEMO "false" production
# same = browser calls same-origin /api (Vercel serverless). off = SPA mock only.
add VITE_API_URL "same" production
add VITE_API_URL "same" preview

# LLM keys from local .env (never push localhost DB / weak JWT)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  if [ -n "${MISTRAL_API_KEY:-}" ]; then
    add MISTRAL_API_KEY "$MISTRAL_API_KEY" production
    add LLM_PROVIDER "${LLM_PROVIDER:-mistral}" production
    add MISTRAL_BASE_URL "${MISTRAL_BASE_URL:-https://api.mistral.ai/v1}" production
    add MISTRAL_MODEL "${MISTRAL_MODEL:-mistral-small-latest}" production
  fi
fi

echo "Redeploy production..."
npx vercel --prod --yes --token "$VERCEL_TOKEN"
echo "OK → https://www.proofroom.site"
