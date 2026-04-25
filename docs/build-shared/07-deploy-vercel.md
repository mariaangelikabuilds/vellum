# 07 · Deploy — Vercel

## Step 1 — Connect repo

1. Go to https://vercel.com/new.
2. Import the GitHub repo you created in `01-base-setup.md`.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: leave as repo root.
5. Build command: `pnpm build` (auto).
6. Click **Deploy**.

First deploy will fail because env vars aren't set. That's expected.

## Step 2 — Set production env vars

In Vercel dashboard → project → **Settings** → **Environment Variables**.

Add every var from `.env.local`:

| Variable                                | Environments         |
|-----------------------------------------|---------------------|
| `ANTHROPIC_API_KEY`                     | Production, Preview |
| `DATABASE_URL`                          | Production          |
| `DATABASE_URL` (different)              | Preview (use Neon branch) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`     | Production, Preview |
| `CLERK_SECRET_KEY`                      | Production, Preview |
| `STRIPE_SECRET_KEY`                     | Production          |
| `STRIPE_WEBHOOK_SECRET`                 | Production          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`    | Production, Preview |
| `BRAINTRUST_API_KEY`                    | Production, Preview |
| `NEXT_PUBLIC_APP_URL`                   | Production = your domain · Preview = `${VERCEL_URL}` |

For Stripe in Preview, use **Test mode** keys.

## Step 3 — Trigger redeploy

```bash
git commit --allow-empty -m "deploy: trigger redeploy with envs"
git push
```

Or in Vercel dashboard → **Deployments** → latest → **Redeploy**.

## Step 4 — Custom domain

1. Vercel dashboard → project → **Domains** → add your domain.
2. Update DNS at your registrar (A record → `76.76.21.21` or follow Vercel's instructions for ALIAS/CNAME).
3. SSL is automatic.

## Step 5 — Configure webhooks for prod

After the production URL is live, update webhook endpoints:

- **Clerk** dashboard → Webhooks → endpoint URL = `https://yourdomain.com/api/webhooks/clerk`.
- **Stripe** dashboard → Developers → Webhooks → endpoint URL = `https://yourdomain.com/api/webhooks/stripe`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

## Step 6 — Database migrations on deploy

Add a `vercel.json` in repo root:

```json
{
  "buildCommand": "pnpm db:migrate && pnpm build"
}
```

Where `db:migrate` is:

```json
{
  "scripts": {
    "db:migrate": "drizzle-kit migrate"
  }
}
```

For preview branches with their own DB (Neon branching), use `DATABASE_URL` pinned per-environment in Vercel.

## Step 7 — Background jobs

If your project uses Inngest / Trigger.dev, deploy the worker separately to Railway or Fly:

```bash
# Railway
railway login
railway link
railway up
```

Set the same env vars in Railway dashboard.

## Step 8 — Observability

Add Sentry:

```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

It will auto-create `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`. Set `SENTRY_DSN` in Vercel envs.

## Step 9 — Smoke test prod

Open the deployed URL. Walk through:
1. Sign up flow → org created → user synced to DB.
2. Trigger an agent call → check Langfuse dashboard for the trace.
3. Subscribe via Stripe test card (`4242 4242 4242 4242`) → check `subscriptions` table.
4. Check Sentry for any errors.

## Step 10 — Monitoring + alerts

- **Vercel Analytics** (free tier) — page views, web vitals.
- **Sentry alerts** — Slack notification on any prod error.
- **Stripe billing alerts** — failed payments, cancellations.
- **Langfuse alerts** — eval score drops, cost anomalies.

## Senior callouts

- **Why Neon branch per Vercel preview?** Lets you test schema migrations on real-shaped data without affecting prod. Set up via Neon's Vercel integration.
- **Why eval-gated deploys?** Build command runs `db:migrate && build`, but in production-grade setups you also gate on `pnpm braintrust eval --gate-baseline` to block deploys that regress evals (see 06-evals-braintrust.md).
- **Why separate worker on Railway/Fly?** Vercel functions have a 10-30s timeout; long-running agent jobs need a real worker. Don't try to fit everything in serverless.
- **Why `vercel.json` for build command?** Lets you customize without touching `package.json`'s build script (which dev tooling depends on).
