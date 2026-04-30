# Build log

> Daily-ish notes on what I built, what was hard, what Claude Code helped with. Source material for the case study at `projects-research/projects/vellum/narrative-case-study.md`.
>
> Discipline: don't try to remember at the end of the build. Capture as you go.

## Format per entry

```
## YYYY-MM-DD · Phase N · <topic>
- What I built / decided.
- What was hard.
- What CC helped with (specific files, prompt patterns, eval iterations).
- Time: ~Xhr over Y sessions.
- Eval/cost deltas: <if relevant>
```

---

## 2026-04-25 · Phase 0 · Decision committed

- Decision: building Penstroke as the hero portfolio project.
- Hero repo scaffolded at `C:\Users\Angel\projects-build\vellum\`.
- BUILD.md is the literal end-to-end guide; following it section by section.
- Goal: v1 in ~5 weeks of focused build interleaved with interviewing.
- Target ship: week of 2026-05-30.
- First Claude Code session in this repo: tomorrow (Phase 1 + 2 — prerequisites verification + Next.js base setup).

Why Penstroke (vs. Loom / Copy Audit / Bindery / Canon / Polyglot):
- Maximum load-bearing design surface (custom ProseMirror schema + side-pane viz).
- Senior architecture crown (CRDT + AGE + two-tier routing + eval-gated deploys).
- I am the user (long-form writer; iteration feedback comes from my own drafting).

See full reasoning: `projects-research/decision.md`.

---

## 2026-04-25 · Phases 1-8 · Sections 1-8 shipped in one session

Single focused session, ~6hr in CC. Sections 1 (prerequisites), 2 (base setup), 3 (db + AGE + schema + seed), 4 (Clerk auth), 6 (agent fleet), 7 (frontend), 8 (eval harness) all functional + committed. Section 5 (Stripe) deferred per v1 cutlist; trackAgentCall stub captures usage. Section 9 (deploy) prepped, awaiting Vercel click-through.

### What I built

- **Toolchain + 13 service accounts** verified or signed up (Anthropic, Neon→Azure, Clerk, Stripe, Voyage, Exa, Trigger.dev, Resend, Sentry, Langfuse, Braintrust, GitHub, Cloudflare). All keys in `.env.local`, `.env.example` committed as the template.
- **Architecture pivot mid-Section-3:** discovered Neon does NOT support Apache AGE. Migrated to Azure Postgres Flexible Server (B1ms free tier), kept the architecture story intact ("AGE on Postgres + pgvector, single transactional consistency boundary").
- **Drizzle schema** with 7 tables (orgs, users, documents, revisions, bibliography, usage, subscriptions), custom bytea + vector(1024) types, HNSW index on embeddings.
- **AGE graph helpers** (createClaimVertex, addEdge, findContradictions, findSupportingEvidence, deleteClaim, listClaimsForDocument). Pool sets `search_path = ag_catalog,"$user",public` on every connection acquire.
- **Three agents** (claim-detector on Haiku, verifier on Sonnet+4 tools, gap-detector on Sonnet) wired with two-tier routing, prompt caching, 8-iter cap on the verifier, fence-stripping JSON parser.
- **Tiptap v3 editor** with custom claim/evidence/question marks, debounced (800ms) `/api/detect-claims` calls, side-pane that refetches on each detection event.
- **Clerk auth** with proxy.ts protecting `/app(.*)` and `/api/{documents,detect-claims}(.*)`. Sign-in/up routes, OrganizationSwitcher in header, on-demand `syncCurrentUser()`.
- **Braintrust eval harness**: 12-entry gold set, three custom scorers, first run = 91.67% claim_count_match, 83.33% type_match, 0 errors.
- **DEPLOY.md** at root with the click-through Vercel guide.

### What was hard (BUILD.md staleness — 11 items caught)

1. Tiptap v3 renamed `extension-collaboration-cursor` → `extension-collaboration-caret`
2. `@trigger.dev/nextjs` deprecated; v4 SDK handles framework integration directly
3. Tailwind 4 uses CSS `@theme` blocks, not v3's `tailwind.config.ts`
4. `next/font/google` provides Geist directly; `geist` npm package is unnecessary on Next 16
5. Exa `type: 'neural'` → `type: 'auto'` (deprecated 2025)
6. Neon doesn't support Apache AGE → switched to Azure Postgres
7. AGE `cypher()` first arg must be a SQL literal, not a parameter (used `sql.raw`)
8. AGE `LOAD 'age'` restricted to superusers on Azure; `shared_preload_libraries=age` handles it
9. `bytea` not exported from drizzle-orm 0.45 pg-core; `customType` workaround
10. `drizzle-kit push` requires TTY; replaced with programmatic `migrate(db, {migrationsFolder})`
11. Pool needs `search_path = ag_catalog` set on every new connection or AGE functions appear missing
12. Next.js 16 renamed `middleware.ts` → `proxy.ts` (deprecation warning fires on old name)
13. Clerk v7 needs `await auth.protect()` (was sync in v6)
14. Tiptap v3 dropped StarterKit `history` option in favor of `undoRedo: false`
15. Braintrust CLI bundles to CJS; `import.meta.url` unavailable
16. Haiku occasionally wraps JSON output in ```json fences despite system-prompt instruction; added strip-fence wrapper

Each one took 3-15 minutes to diagnose + fix. The case-study story: shipped despite stale docs by adapting at the right layer, not by choosing different tech.

### What CC helped with

- File scaffolding for repetitive Drizzle table definitions, mark extensions, and API route handlers
- Diagnosing the AGE search_path issue from a single 'function cypher does not exist' error
- Catching the dotenv-import-order bug in seed.ts (Pool initialized before .env.local loaded → ECONNREFUSED)
- Generating the Penstroke-specific eval gold set with realistic essay-style claims
- Drafting DEPLOY.md from BUILD.md Section 9 plus the Cloudflare worker scope-cut

### Eval / cost deltas

- Detector run on 12-entry gold set: ~$0.001 total (Haiku, sub-second per call)
- One smoke test of detect-claims via Anthropic: 6 claims across 3 paragraphs, 100% type accuracy on the test inputs
- Verifier not yet smoke-tested; Trigger.dev v4 task registered but not deployed

### Time

~6hr in one CC session. Average velocity: roughly one BUILD.md section per 45 minutes including the staleness-fix detours.

### Tomorrow

- Click through Vercel deploy (DEPLOY.md is the script)
- Wire Sentry source maps via `pnpm dlx @sentry/wizard`
- Push gold set from 12 → 30 entries to hit BUILD.md type_match ≥0.85 target
- Smoke-test the verifier with a real bibliography insert

---

## Template entries (delete or fill in as you build)

## YYYY-MM-DD · Phase 1 · Prerequisites verified

[fill in]

## YYYY-MM-DD · Phase 2 · Base setup complete

[fill in]

## YYYY-MM-DD · Phase 3 · Database schema + AGE

[fill in — note the schema iterations as they happen]

## YYYY-MM-DD · Phase 5a · Claim-detector agent

[fill in — eval scores per iteration; specific Claude Code prompts that worked]

## YYYY-MM-DD · Phase 5b · Verification agent + tool use

[fill in]

## YYYY-MM-DD · Phase 5c · Gap-detector

[fill in]

## YYYY-MM-DD · Phase 6 · Tiptap custom marks

[fill in — note the schema iterations]

## YYYY-MM-DD · Phase 6 · Yjs CRDT integration

[fill in — the projection function story]

## YYYY-MM-DD · Phase 7 · Eval harness + CI gate

[fill in]

## YYYY-MM-DD · Phase 8 · Vercel + Cloudflare deploy

[fill in]

## YYYY-MM-DD · v1 SHIPPED

[fill in — retro: what worked, what surprised, what I'd do differently]
