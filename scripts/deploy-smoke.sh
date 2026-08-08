#!/usr/bin/env bash
# Deploy path smoke: secrets validation + compose config + optional live health.
# Does not require a public domain — safe for CI/local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass() { echo "  ✓ $*"; }
fail() { echo "  ✗ $*" >&2; exit 1; }
warn() { echo "  ~ $*"; }

echo "== ProofRoom deploy smoke =="

# ── 1. Secrets rules (mirror server assertSafeConfig) ──────────────
NODE_ENV="${NODE_ENV:-production}"
JWT_SECRET="${JWT_SECRET:-}"
CORS_ORIGIN="${CORS_ORIGIN:-}"
SEED_DEMO="${SEED_DEMO:-false}"

if [[ "$NODE_ENV" == "production" ]]; then
  WEAK=("" "change-me-in-production" "dev-proofroom-secret-change-me" "ci-test-secret" "secret" "jwt-secret")
  for w in "${WEAK[@]}"; do
    if [[ "$JWT_SECRET" == "$w" ]]; then
      fail "JWT_SECRET is weak/empty — set ≥32 random chars (see deploy/SECRETS.md)"
    fi
  done
  if [[ ${#JWT_SECRET} -lt 32 ]]; then
    fail "JWT_SECRET length ${#JWT_SECRET} < 32"
  fi
  pass "JWT_SECRET strength"
  if [[ "$CORS_ORIGIN" == "*" ]]; then
    fail "CORS_ORIGIN=* forbidden in production"
  fi
  if [[ -n "$CORS_ORIGIN" ]]; then
    pass "CORS_ORIGIN set"
  else
    warn "CORS_ORIGIN empty (compose default may apply)"
  fi
  if [[ "$SEED_DEMO" == "true" ]]; then
    warn "SEED_DEMO=true in production (demo passwords)"
  else
    pass "SEED_DEMO off or unset"
  fi
else
  pass "NODE_ENV=$NODE_ENV (secret checks skipped)"
fi

# ── 2. Compose files parse ─────────────────────────────────────────
if command -v docker >/dev/null 2>&1; then
  docker compose -f docker-compose.yml config >/dev/null || fail "docker-compose.yml invalid"
  pass "docker-compose.yml"
  docker compose -f docker-compose.yml -f docker-compose.tls.yml config >/dev/null 2>&1 \
    || JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48)}" \
       docker compose -f docker-compose.yml -f docker-compose.tls.yml config >/dev/null \
    || fail "tls compose invalid"
  pass "docker-compose.tls.yml"
else
  warn "docker not installed — skip compose validate"
fi

# ── 3. Required deploy artifacts ───────────────────────────────────
for f in deploy/Caddyfile deploy/nginx.conf deploy/SECRETS.md Dockerfile.web server/Dockerfile; do
  [[ -f "$f" ]] || fail "missing $f"
done
pass "deploy artifacts present"

# ── 4. Optional live probes ────────────────────────────────────────
API="${API_URL:-http://127.0.0.1:8787}"
if curl -sS --max-time 3 --fail "$API/api/health/live" >/dev/null 2>&1; then
  pass "live $API/api/health/live"
  READY=$(curl -sS --max-time 5 "$API/api/health/ready" || true)
  echo "$READY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('ok')" 2>/dev/null \
    && pass "ready" || warn "ready not ok"
  FULL=$(curl -sS --max-time 5 "$API/api/health" || true)
  echo "$FULL" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  · env=',d.get('env'),' redis=',d.get('redis'),' llm=',d.get('llm'), sep='')" 2>/dev/null || true
else
  warn "API not reachable at $API — start stack then re-run"
fi

# ── 5. TLS tip ─────────────────────────────────────────────────────
cat <<'EOF'

Next (real edge):
  export JWT_SECRET=$(openssl rand -base64 48)
  export NODE_ENV=production SEED_DEMO=false
  export CADDY_DOMAIN=localhost
  export PUBLIC_APP_URL=https://localhost CORS_ORIGIN=https://localhost
  npm run docker:tls
  curl -k https://localhost/api/health

EOF

echo "== DEPLOY SMOKE PASS =="
