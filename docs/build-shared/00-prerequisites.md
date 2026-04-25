# 00 · Prerequisites

Once. Reusable across every project in this library. The build guide for any project links here for the foundation.

## Local toolchain

```bash
# Node (current LTS, via fnm or nvm)
fnm install --lts
fnm use lts-latest
node --version   # → v22.x or v20.x

# pnpm (faster than npm; the workspace standard)
npm install -g pnpm
pnpm --version   # → 9.x or 10.x

# Git (you already have this on Windows via Git Bash)
git --version

# GitHub CLI for repo + PR ops
# Windows: winget install GitHub.cli
# macOS: brew install gh
gh --version
gh auth login    # follow the browser flow
```

## Editor + AI tooling

- **Cursor** (or VS Code with Continue) for inline AI assist in the editor.
- **Claude Code** CLI for agentic refactors, scaffolds, eval iteration. Install: `npm install -g @anthropic-ai/claude-code`.
- (Optional) **Codex CLI** if you want a second model voice for cross-checks.

## Service accounts (sign up once)

Create an account on each. You'll add API keys per-project.

| Service        | Purpose                              | URL                          |
|----------------|--------------------------------------|------------------------------|
| Vercel         | Frontend hosting + edge functions    | https://vercel.com           |
| Neon           | Postgres                             | https://neon.tech            |
| Clerk          | Auth (org mode for multi-tenant)     | https://clerk.com            |
| Stripe         | Billing (use TEST mode for dev)      | https://stripe.com           |
| Anthropic      | Claude API                           | https://console.anthropic.com |
| Voyage AI      | Embeddings (better than ada)         | https://www.voyageai.com     |
| Resend         | Transactional email                  | https://resend.com           |
| Sentry         | Error monitoring                     | https://sentry.io            |
| Langfuse       | LLM trace observability              | https://langfuse.com         |
| Braintrust     | Eval harness (free tier ample)       | https://www.braintrust.dev   |
| GitHub         | Repo + Actions CI                    | https://github.com           |
| Cloudflare     | R2 (object storage), Workers (optional) | https://www.cloudflare.com |
| Inngest        | Durable workflows + cron             | https://www.inngest.com      |

For some projects you'll also need: Browserbase (browser-agent infra), Modal (serverless GPU), Replicate (model inference), AssemblyAI (transcription), ElevenLabs (voice), LiveKit (real-time audio/video), WorkOS (enterprise SSO).

## Domain

Buy a domain for your hero. `.com` if available, else `.app` / `.dev` / `.so`. Add it to Vercel before launch. Approx $12/yr.

## SSH key + GitHub

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub  # copy the output
gh ssh-key add ~/.ssh/id_ed25519.pub --title "$(hostname)"
```

## Workspace conventions

- All env vars in `.env.local` (gitignored). Template at `.env.example`.
- All secrets in Vercel env vars + Clerk dashboard for prod. NEVER commit secrets.
- Repo layout: `src/app` (Next.js), `src/components`, `src/lib`, `src/db`, `src/ai`, `evals/`, `tests/`.
- Branch convention: `main` is always-deployable; feature branches via `git checkout -b feat/<thing>`; PRs reviewed by Claude Code via the agent suite if available.

## Sanity check

Before starting any project:

```bash
node --version  # ≥ 20
pnpm --version  # ≥ 9
git --version   # any
gh auth status  # logged in
```

If any fail, fix before proceeding. Don't try to "patch around" — build foundations matter.
