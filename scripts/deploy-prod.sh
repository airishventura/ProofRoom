#!/usr/bin/env bash
# Wire production env on Vercel and redeploy (SPA + serverless API).
# Usage:
#   export DATABASE_URL='postgresql://...'
#   export JWT_SECRET="$(openssl rand -base64 48)"
#   export BOOTSTRAP_EMAIL='you@example.com'
#   export BOOTSTRAP_PASSWORD='long-password'
#   ./scripts/deploy-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${DATABASE_URL:?Set DATABASE_URL (Neon/Supabase/Postgres)}"
: "${JWT_SECRET:?Set JWT_SECRET (≥32 chars, not a default)}"

if [[ ${#JWT_SECRET} -lt 32 ]]; then
  echo "JWT_SECRET must be ≥ 32 characters" >&2
  exit 1
fi

PUBLIC_APP_URL="${PUBLIC_APP_URL:-https://www.proofroom.site}"
CORS_ORIGIN="${CORS_ORIGIN:-https://www.proofroom.site,https://proofroom.site}"
BOOTSTRAP_EMAIL="${BOOTSTRAP_EMAIL:-}"
BOOTSTRAP_PASSWORD="${BOOTSTRAP_PASSWORD:-}"
BOOTSTRAP_NAME="${BOOTSTRAP_NAME:-Admin}"

add() {
  local key="$1" val="$2" env="${3:-production}"
  echo "→ $key ($env)"
  printf '%s' "$val" | npx vercel env rm "$key" "$env" --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | npx vercel env add "$key" "$env"
}

echo "Auth..."
npx vercel whoami

# Frontend: same-origin API on Vercel
add VITE_API_URL "same" production
add VITE_API_URL "same" preview
add PUBLIC_APP_URL "$PUBLIC_APP_URL" production
add CORS_ORIGIN "$CORS_ORIGIN" production
add NODE_ENV production production
add SEED_DEMO false production

add DATABASE_URL "$DATABASE_URL" production
add JWT_SECRET "$JWT_SECRET" production
add JWT_TTL "${JWT_TTL:-7d}" production

if [[ -n "$BOOTSTRAP_EMAIL" && -n "$BOOTSTRAP_PASSWORD" ]]; then
  add BOOTSTRAP_EMAIL "$BOOTSTRAP_EMAIL" production
  add BOOTSTRAP_PASSWORD "$BOOTSTRAP_PASSWORD" production
  add BOOTSTRAP_NAME "$BOOTSTRAP_NAME" production
fi

# LLM from local .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  if [[ -n "${MISTRAL_API_KEY:-}" ]]; then
    add MISTRAL_API_KEY "$MISTRAL_API_KEY" production
    add LLM_PROVIDER "${LLM_PROVIDER:-mistral}" production
    add MISTRAL_BASE_URL "${MISTRAL_BASE_URL:-https://api.mistral.ai/v1}" production
    add MISTRAL_MODEL "${MISTRAL_MODEL:-mistral-small-latest}" production
  fi
fi

echo "Deploy production..."
npx vercel --prod --yes
echo "OK → $PUBLIC_APP_URL"
echo "Health: curl -sS $PUBLIC_APP_URL/api/health"
