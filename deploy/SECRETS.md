# ProofRoom secrets & production checklist

Never commit real values. Use a secrets manager or host env vars.

## Required in production

| Variable | Rules |
|----------|--------|
| `JWT_SECRET` | ≥ 32 random chars; **not** `change-me-in-production` / `dev-proofroom-secret-change-me` |
| `DATABASE_URL` | Strong DB password; not `proofroom:proofroom@localhost` |
| `POSTGRES_PASSWORD` | Same strength when using Compose |
| `CORS_ORIGIN` | Explicit origin(s), comma-separated; **not** `*` |
| `PUBLIC_APP_URL` | Public HTTPS web origin (published report links) |
| `NODE_ENV` | `production` (enables secret validation + stricter rate limits) |

## Strongly recommended

| Variable | Purpose |
|----------|---------|
| `MISTRAL_API_KEY` | Live chat (otherwise local retrieval fallback) |
| `SEED_DEMO` | **`false`** in production — disables `sarah@acme.com` / `demo1234` seed |
| `VITE_API_URL` | Browser-reachable API URL for the web image build |

## Rate limits (optional overrides)

| Variable | Default (prod) | Meaning |
|----------|----------------|---------|
| `RATE_LIMIT_LOGIN` | 10 | Max login attempts / window / IP |
| `RATE_LIMIT_LOGIN_WINDOW_MS` | 900000 (15m) | Login window |
| `RATE_LIMIT_CHAT` | 30 | Max chat streams / window / user+IP |
| `RATE_LIMIT_CHAT_WINDOW_MS` | 60000 (1m) | Chat window |
| `REDIS_URL` | (off) | When set, rate limits use Redis (multi-instance) |

## Object storage (publish PDFs)

| Variable | Default | Meaning |
|----------|---------|---------|
| `OBJECT_STORAGE_PATH` | `server/data/objects` | Local filesystem root for sealed PDFs |

## SSO / OIDC (optional)

| Variable | Meaning |
|----------|---------|
| `OIDC_ISSUER` | Token issuer (required to enable SSO) |
| `OIDC_AUDIENCE` | Expected `aud` claim |
| `OIDC_JWKS_URL` | JWKS for RS256 providers |
| `OIDC_HS_SECRET` | Dev-only HS256 shared secret for id_tokens |
| `OIDC_DEFAULT_ORG_ID` | Org for auto-provision (`org_acme`) |

`POST /api/auth/sso` with `{ "idToken": "..." }` issues a ProofRoom JWT.

## Generate secrets

```bash
# JWT
openssl rand -base64 48

# Postgres password
openssl rand -base64 24
```

## Demo seed

- **Development:** `SEED_DEMO` defaults to `true` (demo login works).
- **Production:** defaults to `false`. Set `SEED_DEMO=true` only for staged demos; rotate/remove demo users afterward.

## TLS

See `docker-compose.tls.yml` + `deploy/Caddyfile` for HTTPS via Caddy (auto Let’s Encrypt or local certs).

## Health probes

| Path | Use |
|------|-----|
| `GET /api/health/live` | Liveness (process up) |
| `GET /api/health/ready` | Readiness (DB) |
| `GET /api/health` | Full status (db, llm, env) |
