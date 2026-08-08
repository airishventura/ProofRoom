# ProofRoom Architecture

## Stack Recommendation (Production)
- **Frontend:** Next.js 14 (App Router) with TypeScript
- **Backend:** Next.js API Routes / Node Express / FastAPI
- **Database:** PostgreSQL (rooms, docs, runs, audit) + Redis (cache, sessions)
- **Storage:** S3 / Cloudflare R2 for uploads
- **Auth:** Clerk / NextAuth.js (OAuth + JWT)
- **AI:** OpenAI / Anthropic APIs with streaming
- **Deployment:** Vercel / Railway / Docker on AWS
- **Monitoring:** Sentry + PostHog / Mixpanel

## Current Implementation

### Local demo (default)
- Mock service layer (`src/services/`) with unified `pr.v1.*` Store
- File ingestion (text types) + chunk store + SHA-256 evidence seals
- Pipeline orchestration, approvals, publish microsite

### API mode (Sprint C)
- `server/` — Hono on `:8787`
- Postgres (`docker compose`) — users, rooms, documents, chunks, runs, **audit_log**
- JWT auth (`jose` + bcrypt) — seed user `sarah@acme.com` / `demo1234`
- Mistral (OpenAI-compatible) streaming chat when `MISTRAL_API_KEY` set; else local retrieval SSE
- Frontend dual-mode: set `VITE_API_URL` → JWT login + server chat stream
- Postgres first (Docker); Supabase deferred
