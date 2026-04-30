# vellum-app

Next.js 16 application code for the [Penstroke](../README.md) hero project.
The repo root has the case study; this subdir has the running code.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind v4 + shadcn/ui (button, card, dialog, input, popover, tooltip, sonner, separator, scroll-area)
- Tiptap v3 with custom claim/evidence/question marks
- Yjs CRDT (in-memory for v1)
- Drizzle + pg driver against Azure Postgres Flexible Server (B1ms)
- Apache AGE 1.6.0 (graph) + pgvector 0.8.2 (embeddings)
- Anthropic SDK with two-tier model routing (Haiku / Sonnet)
- Trigger.dev v4 SDK for the verification job queue
- Clerk for auth (proxy.ts, org-mode aware)
- Braintrust for eval-gated CI

## Local development

```bash
pnpm install
cp .env.example .env.local
# fill in keys (see ../docs/build-shared/00-prerequisites.md for sources)

pnpm db:setup-extensions          # CREATE EXTENSION age + create_graph
pnpm tsx scripts/test-pgvector.ts # CREATE EXTENSION vector
pnpm tsx scripts/migrate.ts       # apply Drizzle migrations
pnpm tsx scripts/post-migrate.ts  # HNSW index on bibliography.embedding
pnpm db:seed                      # 1 org / 1 user / 1 doc + 2 claims

pnpm dev                          # http://localhost:3000
```

## Scripts

- `pnpm dev` — Next.js dev server (Turbopack)
- `pnpm build` / `pnpm start` — production build
- `pnpm typecheck` / `pnpm lint` / `pnpm format`
- `pnpm db:generate` — Drizzle migration from schema diff
- `pnpm tsx scripts/migrate.ts` — apply migrations programmatically (no TTY)
- `pnpm db:seed` — idempotent test data (org/user/doc + AGE claims)
- `pnpm eval` — run Braintrust regression suite

## Deploy

See [`../DEPLOY.md`](../DEPLOY.md) at the repo root.
