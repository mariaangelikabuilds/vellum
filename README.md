# Vellum

> A graph-of-claims word processor for essayists, analysts, and longform writers.

[Demo · vellum.dev] · [Case study · vellum.dev/architecture] · [Build log · vellum.dev/build]

## What it is

Most AI writing tools polish prose. Vellum sees the *structure* of an argument.

As you write, every sentence with a claim becomes a node in a typed graph. Every citation becomes an edge. A background agent fleet checks each claim against your bibliography and the open web — flagging unsupported assertions, contradictions across paragraphs, and missing premises before you ship.

The export is prose. The underlying structure is queryable.

## Quick demo

Write three paragraphs of an essay. The side-pane populates with a typed claim graph — claims highlighted, evidence marked, questions surfaced. A yellow ribbon appears: "claim in paragraph 2 contradicts claim in paragraph 5." Click reconcile; an agent drafts the fix. Graph updates. Warning clears.

You ship the essay knowing every claim is defended.

## Senior architecture, briefly

- **Yjs CRDT + custom Tiptap/ProseMirror schema** — prose document and claim graph stay in sync under concurrent edits via a deterministic projection function. CRDT-mergeable both directions.
- **Apache AGE on Postgres** — graph traversals, relational queries, and pgvector retrieval in one database. Single transactional consistency boundary; no cross-DB sync.
- **Two-tier model routing** — Haiku for sub-200ms claim-detection (high frequency), Sonnet for high-stakes verification with tool use (low frequency). Cost-disciplined; $1.60/active user/month at scale.
- **Eval-gated deploys** — Braintrust runs nightly regression tests on claim-detection and contradiction-detection. CI blocks deploys that drop more than 0.05 below baseline.
- **Background verification via Trigger.dev** — verification doesn't block the request path; UI streams updates over WebSocket as agents finish.

Full architecture: see `BUILD.md` section 6 + the case study at `vellum.dev/architecture`.

## Tech stack

| Layer            | Choice                                                      |
|------------------|-------------------------------------------------------------|
| Frontend         | Next.js 15 + TypeScript + Tailwind + shadcn/ui              |
| Editor           | Tiptap (ProseMirror) with custom claim/evidence/question marks |
| Realtime         | Yjs over Cloudflare Workers + Durable Objects               |
| Backend          | Hono on Cloudflare Workers + Trigger.dev v3 for workflows   |
| Database         | Neon Postgres + Apache AGE + pgvector                       |
| AI               | Claude Sonnet 4.6 + Haiku 4.5 + Voyage embeddings + Exa     |
| Evals            | Braintrust (eval-gated CI) + Langfuse (LLM traces)          |
| Auth + billing   | Clerk org mode + Stripe (subscription + metered)            |
| Hosting          | Vercel (app) + Cloudflare (WS relay) + Trigger.dev (workers) |

## Build it yourself

The literal end-to-end build (every command, every file, every config) is in [`BUILD.md`](./BUILD.md). Estimated time: ~5 weeks of focused build interleaved with other work.

```bash
# After following BUILD.md sections 1-2:
pnpm install
cp .env.example .env.local
# fill in: ANTHROPIC_API_KEY, DATABASE_URL, CLERK_*, etc.
pnpm db:push
pnpm db:seed
pnpm dev
# open http://localhost:3000
```

## Status

- [ ] v1 — single-user, no billing, hosted demo at vellum.dev (target: ~5 weeks from build start)
- [ ] v2 — multi-user collab, Stripe billing, mobile read (post-v1)
- [ ] v3 — public API, embeddable widget, OS schema (~3 months past v2)

Track progress: see [`docs/build-log.md`](./docs/build-log.md).

## How this was built

Vellum was built solo using **Claude Code as pair-programmer**. The case-study story:

- **Architectural choices** (Yjs vs. OT, AGE vs. Neo4j, two-tier model routing) — author's calls.
- **Boilerplate + repetitive refactors + eval scaffolding** — delegated to Claude Code.
- **The hard parts** (CRDT projection function, verification tool-use loop, cost-tier routing) — iterated in agent-pair-programming sessions; diff history is public.

Velocity: roughly 3-person-team output by one engineer with disciplined AI delegation. Read the [build log](./docs/build-log.md) for the daily detail.

## Contact

- **Author:** Angel Agutaya — [LinkedIn] · [Twitter]
- **Issues:** GitHub Issues
- **Demo / questions:** angel@vellum.dev

## License

[TBD — likely MIT for the schema (typed-claim ontology), source-available for the app code]

## Acknowledgments

- **Clearbrief** for proving the graph-aware writing model in legal.
- **Tiptap** for saving ~3 weeks of ProseMirror scaffolding.
- **Yjs** + **Apache AGE** + **Trigger.dev** + **Braintrust** + **Anthropic** + **Neon** + **Clerk** + **Vercel** + **Cloudflare** for the stack that made this shippable solo.
