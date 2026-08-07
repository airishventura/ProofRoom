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
- Mock service layer (`src/services/`) with `localStorage` persistence
- IndexedDB persistence (`src/services/persistent-db.ts`) for cross-session storage
- Real file ingestion (`FileReader`) with simulated chunk extraction and embeddings
- Full audit trail (`AuditService`) with cryptographic receipts
- Revenue tracking (`RevenueService`) per room
- Pipeline orchestration (`OrchestrationService`) with 5-step workflow
