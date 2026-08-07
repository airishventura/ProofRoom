# ProofRoom — Verifiable AI Workspace

## Positioning
Private workspace for due diligence, internal research, and client-ready reports. Built for business and professional use — **not for the most sensitive regulated workloads on day one**.

## MVP Features
- Private / shared endpoint isolation (auth token based)
- Verified AI runs with cryptographic evidence receipts
- Document ingestion with chunk extraction
- Multi-step agent workflow pipeline with approval gates
- Audit layer: model path, receipt ID, cost history, verification hash, tokens
- One-click report microsite / portal with signed citations
- Revenue model: SaaS subscription (A), usage-based AI margin (B), publishing add-ons (C), services (D)

## Architecture
```
Frontend: React + Vite + TypeScript (5 standalone pages)
Backend Services: Mock service layer (localStorage / IndexedDB)
            → Auth, Ingestion, Orchestration, Audit, Publish, Revenue
Design System: Regex Lab warm premium (paper #faf9f7, gold #c8986e, match #3d6e58)
```

## Stack Recommendation (Production)
For true production deployment, migrate to:
- **Frontend:** Next.js 14 (App Router) for real routing and SSR
- **Backend:** Next.js API routes or separate Node/Express service
- **Database:** PostgreSQL (rooms, docs, runs, audit) + Redis (cache, sessions)
- **Storage:** S3 / Cloudflare R2 for document uploads
- **AI:** OpenAI / Anthropic APIs with streaming
- **Auth:** NextAuth.js or Clerk (OAuth + JWT)
- **Deployment:** Vercel / Railway / Docker on AWS

The current mock service layer (`src/services/`) is designed to swap directly — replace `DB.insert()` with SQL queries and `localStorage` with Redis/DB connections without changing the frontend interface.

## Pages
- `/` — Landing with interactive demo
- `/workspace` — Document workspace + agent chat + audit
- `/audit` — Full audit layer
- `/publish` — Microsite generator + revenue model
- `/approvals` — Approval controls + metrics

## Development
```bash
npm install
npm run dev
npm run build
```

No regulated workload handling. Non-regulated business content only.
