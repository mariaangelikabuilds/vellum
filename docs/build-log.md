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

- Decision: building Vellum as the hero portfolio project.
- Hero repo scaffolded at `C:\Users\Angel\projects-build\vellum\`.
- BUILD.md is the literal end-to-end guide; following it section by section.
- Goal: v1 in ~5 weeks of focused build interleaved with interviewing.
- Target ship: week of 2026-05-30.
- First Claude Code session in this repo: tomorrow (Phase 1 + 2 — prerequisites verification + Next.js base setup).

Why Vellum (vs. Loom / Copy Audit / Bindery / Canon / Polyglot):
- Maximum load-bearing design surface (custom ProseMirror schema + side-pane viz).
- Senior architecture crown (CRDT + AGE + two-tier routing + eval-gated deploys).
- I am the user (long-form writer; iteration feedback comes from my own drafting).

See full reasoning: `projects-research/decision.md`.

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
