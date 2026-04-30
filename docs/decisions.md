# Penstroke — decision log

> Why each load-bearing technical choice was made. Updated as decisions get made.
> Pattern per entry: **decision · what I considered · why I picked it · when I'd revisit.**

---

## D1 · Database: Azure Postgres over Neon

**Considered:** Neon (initial choice; serverless Postgres with branching), Supabase (ergonomic dev experience), Azure Database for PostgreSQL Flexible Server.

**Picked:** Azure Postgres Flexible Server, B1ms tier, free for 12 months.

**Why:** Mid-Section-3, I discovered Neon does not support the Apache AGE extension (verified via Neon docs and a community thread). AGE is the architectural spine of Penstroke — graph traversals on the same database as relational queries and pgvector retrieval, single transactional consistency boundary. Without AGE the case-study story collapses. Azure Flexible Server is the only mainstream managed Postgres that allow-lists AGE 1.6.0 across versions 14-18.

**Tradeoff:** Azure has more setup tax than Neon (resource group, server parameters, allow-list step for each extension). The free tier expires after 12 months; at $13/mo the Burstable B1ms is still cheap enough that the architecture wins.

**Revisit when:** v2 traffic exceeds B1ms's connection-pool capacity (~50 concurrent), or Neon ships AGE support.

---

## D2 · Graph layer: Apache AGE over Neo4j Aura

**Considered:** Neo4j Aura (managed cloud), self-hosted Neo4j, Apache AGE on Postgres, pure relational with `claims` + `claim_edges` tables.

**Picked:** Apache AGE on Postgres.

**Why:** Pure relational works (the v1 cutlist contingency plan is exactly this), but loses Cypher's expressive power for multi-hop traversals and pattern matching on the claim graph. Neo4j Aura would mean two databases to keep in sync — relational for documents/users/orgs, graph for claims. Cross-DB transactional consistency is hard; AGE puts everything under one Postgres transaction.

**Tradeoff:** AGE Cypher syntax is parsed at SQL level via the `cypher()` function — that means the first argument (graph name) must be a SQL literal, not a parameter. Drizzle parameterizes interpolated values by default; the workaround is `sql.raw('vellum_claims')` per call. This is mildly ugly but isolated to `src/db/graph.ts`.

**Revisit when:** graph operations exceed AGE's performance envelope (millions of vertices). For an essay's graph (dozens to low hundreds of claims), AGE is well within bounds.

---

## D3 · ORM: Drizzle over Prisma

**Considered:** Prisma (popular, feature-rich), Drizzle (lighter, type-safe SQL builder).

**Picked:** Drizzle.

**Why:** Drizzle compiles to readable SQL with no separate query engine, no global state, no generated client. For a serverless app on Vercel where cold starts matter, Drizzle's runtime cost is negligible. Type safety is excellent. AGE Cypher integration via `db.execute(sql\`...\`)` is straightforward.

**Tradeoff:** `drizzle-kit push` requires a TTY for confirmation — replaced with a programmatic `migrate()` call in `scripts/migrate.ts` for CI/non-interactive environments. `bytea` isn't exported directly from drizzle-orm 0.45's `pg-core`, so we use `customType` (one helper, then transparent).

**Revisit when:** Schema complexity outgrows Drizzle's ergonomics (rare; most teams hit this at 50+ tables, we're at 8).

---

## D4 · Postgres driver: `pg` over `@neondatabase/serverless`

**Considered:** `@neondatabase/serverless` (HTTP-based, Neon-specific), `pg` (standard libpq-based).

**Picked:** `pg` (`drizzle-orm/node-postgres`).

**Why:** Direct consequence of D1. Once we're on Azure Postgres, the Neon-serverless HTTP shim doesn't apply — Azure speaks standard libpq. BUILD.md's defaults pointed at `@neondatabase/serverless` and had to be swapped. Pool config sets `search_path=ag_catalog,public` via libpq `options` so AGE's `cypher()` is discoverable on every new connection without an async race.

**Revisit when:** Returning to Neon (would swap to `@neondatabase/serverless` for HTTP-based connection pooling that survives Lambda cold starts better).

---

## D5 · Two-tier model routing: Haiku for detection, Sonnet for verification

**Considered:** Sonnet for everything (uniform quality), Haiku for everything (uniform cost), tiered.

**Picked:** Tiered. Haiku 4.5 for `claim-detector` (fires on every paragraph change, debounced 1.2s). Sonnet 4.6 for `verifier`, `contradiction-finder`, `reconciler`, `critic`, `outline`, `cowriter`.

**Why:** Detection is high-frequency, low-stakes — Haiku at ~$0.001/call is right. Verification is low-frequency, high-stakes (cite sources, draft fixes) — Sonnet earns the cost. Cost discipline is the difference between a profitable per-active-user and not at scale.

**Tradeoff:** Two prompts to maintain instead of one. Haiku occasionally wraps JSON output in ```json fences despite system-prompt instructions; the fix is a fence-stripping wrapper before `JSON.parse` — cheap, isolated.

**Revisit when:** Sonnet pricing drops below Haiku, or a uniform Sonnet bid passes the eval threshold without the cost penalty.

---

## D6 · Search: Exa over Perplexity / Tavily / SerpAPI

**Considered:** Perplexity (paid, AI-summarized), Tavily (developer-focused), SerpAPI (Google scraping), Exa (semantic search).

**Picked:** Exa, `type: 'auto'`.

**Why:** Verification needs semantic search over the open web — phrases like "claims contradicting Clearbrief's legal AI position" don't lexical-match well. Exa's neural index outperforms keyword-only on this. `type: 'auto'` (Exa's current default; replaces deprecated `'neural'` from BUILD.md's stale docs) balances latency and quality at ~1s/query.

**Tradeoff:** Per-query cost (~$0.005). Mitigated by reserving Exa for the verifier agent (low frequency); detection never calls it.

**Revisit when:** Exa's pricing changes materially or a self-hosted alternative emerges.

---

## D7 · Workflows: Trigger.dev v4 over Inngest / BullMQ / direct cron

**Considered:** Inngest (similar product), BullMQ (DIY queue), direct setTimeout/cron, Trigger.dev v4.

**Picked:** Trigger.dev v4.

**Why:** Background verification needs durable execution: if the request times out, the job continues. Trigger.dev v4's `task` primitive handles retries, idempotency, and observability without me building a queue. BullMQ would mean Redis ops; Inngest would mean another platform to learn.

**Tradeoff:** Trigger.dev v3 had a Next.js-specific adapter (`@trigger.dev/nextjs`) that's deprecated in v4 — BUILD.md docs were stale. v4 SDK handles the framework directly; one fewer package.

**Revisit when:** v2 traffic exceeds free-tier execution minutes (then either pay or move to a queue with self-hosted workers).

---

## D8 · Editor: Tiptap v3 over Slate / Lexical / Plate

**Considered:** Slate (more flexible, less batteries-included), Lexical (Meta's, fast, less ecosystem), Plate (built on Slate), Tiptap v3 (built on ProseMirror).

**Picked:** Tiptap v3.

**Why:** Custom marks for `claim` / `evidence` / `question` are the load-bearing schema element. Tiptap's `Mark.create({ addAttributes, parseHTML, renderHTML })` API is exactly the abstraction needed. Yjs collaboration via `@tiptap/extension-collaboration` is wired in two lines. ProseMirror's docs are dense but the underlying primitives (transactions, marks vs nodes, decorations) match Penstroke's data model 1:1.

**Tradeoff:** Tiptap v3 dropped some v2 features (`StarterKit.history` option, `extension-collaboration-cursor` renamed to `-caret`, `@tiptap/core` is now an explicit dependency rather than transitive). All caught and patched, logged for BUILD.md doc updates.

**Revisit when:** Lexical's plugin API matures enough for marks-based custom schema, or Plate ships a graph-aware editor primitive.

---

## D9 · Typography: Newsreader serif + Libre Franklin chrome (drop Geist Sans + Geist Mono visually)

**Considered:** Geist Sans + Mono (the Vercel default, originally specified by BUILD.md), iA Writer Mono (paid), JetBrains Mono, IBM Plex pairing, all-serif (Newsreader + small caps).

**Picked:** Newsreader (body, hero, editor surface) + Libre Franklin (chrome — labels, tabs, nav, footer). Geist Mono import retained as fallback for future code blocks; visually unused.

**Why:** Geist Sans reads as generic AI/SaaS chrome. Geist Mono reads as terminal/code aesthetic. Penstroke's audience is researchers, journalists, essayists — editorial register, not dev-tool register. Newsreader is designed for screen reading flow; Libre Franklin is the open-source clone of NYT's Franklin Gothic, the actual section-header font of newspaper editorial. The combination is the NYT pairing pattern: serif body, sans-grotesque chrome.

**Tradeoff:** Loading two custom fonts vs one (or zero). Acceptable cost on `next/font` with self-hosting. The "no AI" register is non-negotiable for the positioning.

**Revisit when:** Penstroke picks up a paid licensing budget — would consider Tiempos Headline (display) + iA Writer Mono (chrome).

---

## D10 · Auth: Clerk over NextAuth / Auth0 / Supabase Auth / WorkOS

**Considered:** NextAuth (free, DIY), Auth0 (enterprise-grade), Supabase Auth, WorkOS (enterprise SSO), Clerk.

**Picked:** Clerk with org mode.

**Why:** Multi-tenancy is a v0 requirement (newsrooms, research labs, agency users). Clerk's org primitives are correctly modeled (orgs have memberships, users can belong to multiple, roles are first-class). NextAuth would mean building all of that. Auth0 is overkill for a portfolio scale. The on-demand `syncCurrentUser()` pattern makes the Clerk → Postgres bridge clean.

**Tradeoff:** Clerk pricing at scale. Free tier is generous for v1.

**Revisit when:** v2 needs SSO for B2B (newsroom seat licenses) — that's WorkOS territory, possibly via Clerk's enterprise tier.

---

## D11 · Anti-AI design register

**Considered:** Generic SaaS aesthetic (Linear-style gradients), AI-tool aesthetic (Vercel docs blueprint grid + glowing CTAs), editorial aesthetic (Stripe Press / Mercury / Are.na).

**Picked:** Editorial. No AI tropes. No purple/orange gradients. No glow. No neural-net illustrations. No shimmer animation. No overly futuristic sans. The animated typewriter machine on the hero is a deliberate counter-positioning — it shouts "this is a *writer's tool*" before any text loads.

**Why:** Penstroke's positioning depends on differentiating from AI slop. Tools that look like AI products read as AI products. Long-form writers (the audience) want an instrument, not a SaaS subscription.

**Tradeoff:** Tighter visual constraints make some screens harder to design (no gradient to add visual interest; must use typography + spacing + layout instead). Worth it.

**Revisit when:** Audience research shows the editorial register turns away the broader-market segment. Even then, two design modes (one for writers, one for skim-readers) before abandoning.

---

## D12 · Build velocity: Claude Code as primary pair-programmer

**Considered:** Solo without AI, GitHub Copilot only, Cursor + cmd+k flows, Claude Code via terminal as primary driver.

**Picked:** Claude Code, with a strict division of labor — architecture decisions stay author-side; agent scaffolding, repetitive Drizzle/route code, eval setup delegated.

**Why:** v1 ships ~3-person-team scope solo. The case-study story is exactly this division: senior judgment + AI execution. The 60+ commit log on this repo is the primary-source receipt.

**Tradeoff:** Without discipline this drifts into "AI wrote the architecture, I wrote the prompts." Discipline maintained: every architectural decision documented in this file, every CLAUDE.md staleness item flagged in commit messages, every BUILD.md divergence logged.

**Revisit when:** Never. This pattern is the case study.
