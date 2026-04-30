# Penstroke — deploy

## v1 prod target

- **App:** Vercel (Next.js 16 + Hono routes baked into Next API)
- **Database:** Azure Postgres Flexible Server, B1ms, AGE + pgvector
- **AI:** Anthropic API (Haiku for detection, Sonnet for verification)
- **Workflows:** Trigger.dev v4 (verifyDocument task)
- **Observability:** Sentry + Langfuse + Braintrust
- **Auth:** Clerk (with Postgres org sync via webhook in v2; on-demand in v1)
- **Email:** Resend
- **Domain:** penstroke.app (TBD)

Live collab WebSocket relay (Cloudflare Workers + Durable Objects) is **deferred to v2**. v1 ships single-user with Yjs in-memory.

## Prerequisites

`vellum-app/.env.local` should be fully populated. All values land in Vercel project env settings.

## Step 1 — Vercel project

1. Go to https://vercel.com/new
2. Import `mariaangelikabuilds/vellum` from GitHub
3. **Root Directory:** set to `vellum-app/` (the app code lives there, docs at root)
4. Framework: auto-detected as Next.js
5. Install command: `pnpm install --frozen-lockfile`
6. Build command: `pnpm build`
7. Output directory: `.next` (default)

## Step 2 — Environment variables

Paste the following into Vercel → Project → Settings → Environment Variables. Mark all as Production + Preview unless noted.

```
ANTHROPIC_API_KEY
DATABASE_URL                                  # Azure Postgres
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET                          # set after step 4
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app
VOYAGE_API_KEY
EXA_API_KEY
TRIGGER_API_KEY
TRIGGER_API_URL=https://api.trigger.dev
STRIPE_SECRET_KEY                             # rk_test_ for v1, rotate to live for prod
STRIPE_WEBHOOK_SECRET                         # set after step 5
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
BRAINTRUST_API_KEY
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
SENTRY_DSN
NEXT_PUBLIC_APP_URL=https://penstroke.app        # or vercel preview URL
```

Note: `NEXT_PUBLIC_WS_URL` is omitted — live collab is v2.

## Step 3 — Trigger.dev project link

`@trigger.dev/sdk` v4 deploys jobs separately from Vercel.

```bash
cd vellum-app
pnpm trigger.dev login
pnpm trigger.dev deploy
```

This registers `verifyDocument` task (src/jobs/verify-document.ts) with Trigger.dev's worker fleet.

## Step 4 — Clerk webhook (for prod sync reliability)

1. Clerk dashboard → Webhooks → Add Endpoint
2. URL: `https://<your-domain>/api/webhooks/clerk`
3. Events: `user.created`, `organization.created`, `organizationMembership.created`
4. Copy signing secret → set `CLERK_WEBHOOK_SECRET` in Vercel

(v1 ships with on-demand `syncCurrentUser()` instead; webhook is a nice-to-have.)

## Step 5 — Stripe webhook (when v1 → v2 adds billing)

Deferred. v1 cutlist excludes Stripe checkout/products.

## Step 6 — Custom domain

1. Vercel → Project → Settings → Domains → add `penstroke.app`
2. Update DNS at registrar (CNAME or A record per Vercel instructions)
3. Update `NEXT_PUBLIC_APP_URL` env var to the new domain

## Step 7 — Sentry source maps

`pnpm add -D @sentry/nextjs` (already done) + run wizard:

```bash
pnpm dlx @sentry/wizard@latest -i nextjs
```

This generates `sentry.client.config.ts`, `sentry.server.config.ts`, and wires source maps so production errors deobfuscate.

## Step 8 — Verify

- Hit the deployed URL, sign up
- Create a document, type a paragraph
- Confirm side-pane populates with claims (Anthropic + Postgres reachable)
- Check Langfuse for the trace
- Check Sentry for any errors

## CI / eval-gating (future)

Add `.github/workflows/eval.yml` that runs `pnpm eval` on PRs. Block merge if `type_match` drops more than 0.05 below baseline. Sample workflow lives at `docs/build-shared/06-evals-braintrust.md` step 7.

## Cost expectations (v1, single user)

| Component | Monthly |
|---|---|
| Azure Postgres B1ms (free tier 12mo) | $0 |
| Vercel Hobby | $0 |
| Anthropic Haiku + Sonnet | ~$1-3 |
| Voyage embeddings | ~$0.10 |
| Exa search | ~$0.50 |
| Trigger.dev free tier | $0 |
| Sentry/Langfuse/Braintrust free tiers | $0 |

Approximate: under $5/month for the demo + light use. Per BUILD.md target: ≤$0.10 per active hour.
