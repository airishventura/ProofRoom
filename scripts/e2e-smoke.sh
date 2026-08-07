#!/usr/bin/env bash
# E2E smoke: login → rooms → ingest → verify → gated run → approve → chat → publish → public → audit
set -euo pipefail

API="${API_URL:-http://127.0.0.1:8787}"
EMAIL="${E2E_EMAIL:-sarah@acme.com}"
PASS="${E2E_PASSWORD:-demo1234}"
ROOM="${E2E_ROOM:-r1}"
CHAT_TIMEOUT="${E2E_CHAT_TIMEOUT:-60}"

pass() { echo "  ✓ $*"; }
fail() { echo "  ✗ $*" >&2; exit 1; }

echo "== ProofRoom E2E smoke against $API =="

# 1 health
H=$(curl -sS --fail "$API/api/health") || fail "health"
echo "$H" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('ok') and d.get('db'), d" || fail "health payload"
pass "health db+ok"

# 2 login
LOGIN=$(curl -sS --fail -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}") || fail "login"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
pass "login $EMAIL"

# 3 rooms
curl -sS --fail "$API/api/rooms" -H "$AUTH" | python3 -c "import sys,json; assert len(json.load(sys.stdin)['rooms'])>=1" || fail "rooms"
pass "rooms list"

# 4 ingest + verify
ING=$(curl -sS --fail -X POST "$API/api/documents/ingest" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"roomId\":\"$ROOM\",\"name\":\"e2e-brief.md\",\"text\":\"# E2E Brief\\nRevenue \$1M. Action: close by Friday.\",\"endpoint\":\"private\"}") || fail "ingest"
DOC=$(echo "$ING" | python3 -c "import sys,json; print(json.load(sys.stdin)['documentId'])")
curl -sS --fail -X POST "$API/api/documents/$DOC/verify" -H "$AUTH" >/dev/null || fail "verify"
pass "ingest+verify $DOC"

# 5 gated run + approve
RUN=$(curl -sS --fail -X POST "$API/api/runs" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"roomId\":\"$ROOM\",\"title\":\"E2E Summary\",\"gated\":true}") || fail "create run"
RUN_ID=$(echo "$RUN" | python3 -c "import sys,json; print(json.load(sys.stdin)['run']['id'])")
curl -sS --fail -X POST "$API/api/runs/$RUN_ID/approve" -H "$AUTH" >/dev/null || fail "approve"
pass "approve $RUN_ID"

# 6 chat stream (optional if no LLM — still expect SSE done or local fallback)
CHAT_OUT=$(mktemp)
if curl -sS -N --max-time "$CHAT_TIMEOUT" -X POST "$API/api/chat/stream" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"roomId\":\"$ROOM\",\"message\":\"One line: what is the action?\"}" >"$CHAT_OUT" 2>/dev/null; then
  if grep -q '"type":"done"' "$CHAT_OUT"; then
    pass "chat stream done"
  elif grep -q '"type":"error"' "$CHAT_OUT"; then
    echo "  ~ chat error (non-fatal): $(head -c 120 "$CHAT_OUT")"
  else
    echo "  ~ chat incomplete (non-fatal)"
  fi
else
  echo "  ~ chat timeout/skip (non-fatal)"
fi
rm -f "$CHAT_OUT"

# 7 publish + public
PUB=$(curl -sS --fail -X POST "$API/api/publish" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"roomId\":\"$ROOM\"}") || fail "publish"
echo "$PUB" | python3 -c "import sys,json; r=json.load(sys.stdin)['record']; assert r.get('hash') and r.get('verified')" || fail "publish payload"
pass "publish"

curl -sS --fail "$API/api/publish/public/$ROOM" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('published')" || fail "public"
pass "public report"

# PDF artifact (if endpoint present)
PDF_CODE=$(curl -sS -o /tmp/e2e-report.pdf -w "%{http_code}" "$API/api/publish/public/$ROOM/pdf" || true)
if [[ "$PDF_CODE" == "200" ]]; then
  BYTES=$(wc -c </tmp/e2e-report.pdf)
  [[ "$BYTES" -gt 100 ]] && pass "public pdf ($BYTES bytes)" || echo "  ~ pdf tiny"
else
  echo "  ~ pdf endpoint status=$PDF_CODE (optional)"
fi

# 8 audit export
COUNT=$(curl -sS --fail "$API/api/audit?roomId=$ROOM" -H "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])")
[[ "$COUNT" -ge 1 ]] || fail "audit empty"
CSV_BYTES=$(curl -sS --fail "$API/api/audit/export.csv?roomId=$ROOM" -H "$AUTH" | wc -c)
[[ "$CSV_BYTES" -gt 20 ]] || fail "csv export"
pass "audit count=$COUNT export.csv=${CSV_BYTES}b"

echo "== E2E PASS =="
