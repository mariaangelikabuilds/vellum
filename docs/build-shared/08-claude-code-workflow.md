# 08 · Claude Code workflow throughout this build

The case-study angle for "I shipped this at 3-person-team scope using Claude Code." This file documents the recurring patterns so your build matches the senior narrative on the README.

## The general pattern

1. **Plan a phase** — write a 1-paragraph description of what you're building and the senior signals you want present.
2. **Open Claude Code** in the repo.
3. **Use `/plan`** (Plan Mode) for architectural decisions before writing code.
4. **Use Claude Code agentically** for the actual implementation — let it scaffold, you review, you commit.
5. **Use `/review`** between phases — specifically check for security, multi-tenancy, eval coverage.
6. **Capture decisions in case-study notes** as you go (don't try to remember at the end).

## Phase-by-phase Claude Code use

### Phase 1 (base setup) — minimal CC use
This is mostly `pnpm create next-app` and config. Don't over-engineer the AI involvement here.

### Phase 2 (database) — heavy CC use
This is where senior architecture lives. Use Claude Code to:
- Generate the Drizzle schema from a natural-language data-model description.
- Critique your schema for missing indexes, denormalization opportunities, RLS gaps.
- Write migrations safely (drop/rename are dangerous; CC catches these).

Sample prompt:
```
@db/schema.ts I'm modeling a system where teams have multiple research projects, each with sources (PDFs, transcripts), claims extracted from sources, and citations linking claims to sources. Add the schema. Include: pgvector embedding columns where useful, RLS-friendly orgId on every tenant-scoped table, indexes for the common query patterns (find all claims for a source, find all sources for a project, semantic search on claim text). Use Drizzle conventions matching the existing code style.
```

### Phase 3 (auth) — light CC use
Clerk is mostly config. Use CC for the webhook handler (the one piece with real logic).

### Phase 4 (billing) — medium CC use
Stripe is mostly Stripe-shaped boilerplate with project-specific glue. Use CC to:
- Write the webhook handlers with full event-type coverage.
- Generate the usage-reporting batch job.
- Write the customer portal redirect flow.

### Phase 5 (AI integration) — HEAVIEST CC use
This is where the AI-assisted-build narrative is most visible. Use CC to:
- Iterate the agent prompts in tight loops with eval scores.
- Write the tool-use handler functions.
- Build the cost-tracking middleware.
- Refactor the orchestrator as you learn what doesn't work.

Sample prompt for iteration:
```
@evals/tasks/classifier.eval.ts the `category_match` score is at 0.78. Look at the failures (run `pnpm braintrust eval --inspect=classifier-v1`) and propose 3 prompt changes that target the specific failure cases. Don't make changes; just propose.
```

Then accept/reject the proposals; commit the winning prompt with a note in the commit message about which eval score it improved.

### Phase 6 (frontend) — medium CC use
Next.js + React + shadcn → CC is good at scaffolding components with consistent style. Especially useful for the demo states (which match your `mockup.html`).

### Phase 7 (eval harness) — heavy CC use
Build the eval scaffolding entirely with CC. The pattern:
1. CC writes the dataset loader.
2. CC writes a sample scorer.
3. You add new gold-set entries as you find failures; CC adds them to the dataset.
4. CC suggests new scorers when you encounter a new failure mode.

### Phase 8 (deploy) — light CC use
Vercel is mostly clicking. Use CC to write the `vercel.json` build command and any custom edge middleware.

## Recurring patterns

### Pattern: "let CC plan, you implement"
For tricky architectural choices (CRDT merge logic, agent orchestration topology, database denormalization), use Plan Mode (`/plan` in Claude Code) to brainstorm 3 approaches with trade-offs. Pick one. Implement.

### Pattern: "let CC critique a PR you're about to open"
After staging a feature branch, run CC with:
```
@<changed-files> Review this branch as if you were a senior engineer doing a final pass. Check for: security (sql injection, xss, missing auth), multi-tenancy bugs (missing orgId scoping), eval coverage (any new agent paths without evals?), cost discipline (unbounded loops, missing model-tier routing). Don't just look at code; consider the wider system.
```

### Pattern: "let CC keep your eval set growing"
After every real-user complaint or surprise output, paste it to CC:
```
@evals/datasets/regressions.jsonl Add this failure case: input = "<exact input>", expected = "<what user wanted>". Then run the relevant eval and tell me if the latest model version still fails this case.
```

### Pattern: "let CC write the case-study chunk as you go"
At the end of each phase, ask CC:
```
@<phase-files> Write a 200-word section for my case-study about what I built in this phase, what was hard, and what's senior-flavored about my architecture choices. Concrete; cite specific files and decisions. No marketing tone.
```

This is how the case-study writes itself over time instead of as a panicked end-of-build sprint.

## Capture the build process

`docs/build-log.md` (gitignored or kept private):

```markdown
# Build log

## YYYY-MM-DD · Phase 5 · agent orchestrator
- Initial design: linear pipeline (parse → classify → emit). Ran into: classification was too coarse on long inputs.
- Iteration 2: split classifier into "shallow" (Haiku) + "deep" (Sonnet) tiers; route on input length. Eval score from 0.78 → 0.91.
- CC role: scaffolded the routing logic, suggested the eval harness change to capture per-tier scores separately.
- Time: ~3 hrs over 2 sessions.
```

This becomes raw material for the case-study (06-narrative-shaper agent reads it).

## Senior signal: not just "I used AI"

The case-study story isn't "Claude Code wrote my code." It's:
- "I made architectural choices CC couldn't make." (Eval-gated deploys, multi-tenancy, cost routing — these were my calls.)
- "I shipped at 3-person-team scope because I delegated the right things." (Boilerplate, refactors, eval iteration to CC; system design and product shaping to me.)
- "The diff history shows the velocity." (Public GitHub history with meaningful commit messages tells the story without me having to claim it.)

This is what separates a senior portfolio with AI from a junior one: knowing what to delegate, knowing what's yours.
