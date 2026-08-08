# ProofRoom — Verifiable AI Workspace

Private workspace for due diligence with verified AI runs, approval gates, audit export, and client-ready report portals.

## Modes

| Mode | How |
|------|-----|
| **Local demo** | `npm run dev` — browser `localStorage` (no backend) |
| **API + Postgres** | Docker Postgres + `server/` + Mistral LLM |
| **Full stack Docker** | `npm run docker:up` — db + api + nginx web |
| **Vercel production** | SPA + serverless `api/[[...route]].ts`; set `VITE_API_URL=same` + `DATABASE_URL` (Neon) |

Auth: **Sign up** creates org + private room (`POST /api/auth/register`). Invite tokens join an org. Production should keep `SEED_DEMO=false`.

## Quick start (local demo)

```bash
npm install
npm run dev
```

## Full stack (dev)

```bash
# 1. Database
npm run db:up
# wait for healthy, then:
cd server && npm install && npm run migrate && npm run dev

# 2. Frontend (new terminal)
cp .env.example .env   # set VITE_API_URL=http://localhost:8787
npm install
npm run dev
```

### Demo login (API mode)

- Email: `sarah@acme.com`
- Password: `demo1234`

### LLM (Mistral)

Server-side only — never put keys in the browser or commit `.env`.

```bash
LLM_PROVIDER=mistral
MISTRAL_API_KEY=your_key_here
MISTRAL_MODEL=mistral-small-latest
```

Without a key, chat streams a **local retrieval** fallback from verified chunks.

## Docker deploy

```bash
cp .env.example .env
# set JWT_SECRET, MISTRAL_API_KEY, and strong POSTGRES_PASSWORD

npm run docker:up
# API  http://localhost:8787/api/health
# Web  http://localhost:8080
```

| Service | Port | Notes |
|---------|------|--------|
| `db` | 5432 | Postgres 16 |
| `api` | 8787 | Hono + migrate on start |
| `web` | 8080 | nginx SPA; proxies `/api` → api |

### TLS edge (Caddy)

```bash
# In .env:
# NODE_ENV=production
# JWT_SECRET=$(openssl rand -base64 48)
# SEED_DEMO=false
# CADDY_DOMAIN=localhost   # or your domain
# PUBLIC_APP_URL=https://localhost
# CORS_ORIGIN=https://localhost
# VITE_API_URL=            # empty → same-origin /api via Caddy

npm run docker:tls
# https://localhost  (API under /api)
```

Full secrets checklist: [`deploy/SECRETS.md`](deploy/SECRETS.md).

```bash
npm run docker:logs   # tail api + web
npm run docker:down   # stop stack
```

### Hardening (API)

- Rate limits on login + chat (`429` + `Retry-After`); Redis when `REDIS_URL` set
- Production refuses weak `JWT_SECRET` / `CORS_ORIGIN=*`
- `SEED_DEMO=false` skips demo users in production
- Room reset: `DELETE /api/rooms/:id/data`
- Probes: `/api/health/live`, `/api/health/ready`
- Publish writes sealed PDF → object storage; `GET /api/publish/public/:roomId/pdf`
- Multi-tenant orgs + optional OIDC SSO (`POST /api/auth/sso`)

## Agent tooling (LibAry UI)

VS Code / Copilot agents can load the LibAry MCP from [`.vscode/mcp.json`](.vscode/mcp.json):

```json
{
  "servers": {
    "lib-ary": {
      "type": "http",
      "url": "https://libary.noahwhiteson.com/mcp"
    }
  }
}
```

- **VS Code**: `servers` + `"type": "http"` (this repo’s format).
- **Cursor / some hosts**: use `mcpServers` without the nested `type` field — do not mix keys.
- Workflow: `get_guide` → `list_components` → `get_component` → install with `npx @lib-ary/cli@0.1.0 add <id>` (remote HTTP MCP cannot write disk).
- Pin: `libary.json` records `cliVersion` + installed ids. If CLI lags the MCP registry, use `get_component` and write files under `src/components/lib-ary/<id>/`.
- Components land under `src/components/lib-ary/` as editable source. Design: [`docs/designs/2026-08-07-workspace-libary-redesign.md`](docs/designs/2026-08-07-workspace-libary-redesign.md).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite frontend |
| `npm run dev:server` | API on `:8787` |
| `npm run db:up` | Postgres only |
| `npm run db:migrate` | Schema + seed |
| `npm run docker:up` | Full stack build + run |
| `npm run e2e` | API smoke: login → publish → audit |
| `npm run deploy:smoke` | Secrets + compose + health checks |
| `npm test` | Frontend + server unit tests |
| `npm run build` | Production frontend |

## Architecture

```
Frontend (React/Vite) ──► local services (Store)     [demo]
                     └─► HTTP /api (JWT) ──► Hono server
                                              ├─ Postgres (+ orgs)
                                              ├─ Redis rate limits (opt)
                                              ├─ Mistral / xAI chat stream
                                              ├─ publish snapshots + PDF objects
                                              └─ OIDC SSO (opt)
```

## API surface

- `POST /api/auth/login` · `GET /api/auth/me` · `GET /api/auth/sso/config` · `POST /api/auth/sso`
- `GET /api/orgs/me` · `POST /api/orgs/invites` · accept invite
- `GET /api/rooms` · `DELETE /api/rooms/:id/data` (reset)
- `GET /api/documents` · `POST /api/documents/ingest` · `POST /api/documents/:id/verify`
- `GET/POST /api/runs` · approve/reject
- `GET /api/audit` · `GET /api/audit/export.json|csv`
- `POST /api/chat/stream` (SSE, rate-limited)
- `GET/POST /api/publish` · `DELETE /api/publish/:roomId` · `GET /api/publish/public/:roomId` · `…/pdf`
- `GET /api/health` · `/api/health/live` · `/api/health/ready`

Public microsite UI: `/r/:roomId` (snapshot from publish).

## CI

GitHub Actions: typecheck, vitest, frontend build, migrate Postgres service, server build, health check.

## Still not fully production-hardened

Local object store (not S3 yet), OIDC is token-exchange (no full browser redirect UX), demo seed optional. Use TLS profile + `deploy/SECRETS.md` for staging; wire secrets manager + real IdP JWKS before hard multi-tenant prod.
