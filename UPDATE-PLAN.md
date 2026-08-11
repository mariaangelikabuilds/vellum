# Penstroke update plan

Researched 2026-08-11, four months after the last commit (2026-04-30). Everything below was verified against the repo, the live deployment, or official docs. Anything unverified is marked.

## 0. Sign-in is broken in production, and this is why

The deployment runs a Clerk **development** instance. The production bundle ships `pk_test_cHJvZm91bmQtYmFzcy05Ni5jbGVyay5hY2NvdW50cy5kZXYk`, which resolves to `profound-bass-96.clerk.accounts.dev`. Calling that instance's environment endpoint from the deployed origin returns:

```
401  dev_browser_unauthenticated
"Unable to authenticate this browser for your development instance."
```

Clerk development instances authenticate a browser through a handshake designed for localhost. On a real deployed origin that handshake cannot complete, so the sign-in form renders and then fails. Nothing is wrong with the form, the routes, or the code.

The fix is a Clerk **production** instance with `pk_live_` and `sk_live_` keys. That is not a key swap alone: Clerk production instances require a domain you control, because they need CNAME records on `clerk.<domain>`. So this is blocked on the domain decision below.

Related: `/app`, the post-sign-in destination, returns **404 to signed-out visitors**. Redeployed from current code on 2026-08-11 and it still 404s, so this is not a stale build. `src/proxy.ts` matches `/app(.*)` and calls `auth.protect()`, so the 404 is Clerk refusing an unauthenticated request, which is the guard doing its job. It should resolve on its own once sign-in works. Nothing to fix here beyond auth.

## 1. The domain question, decide this first

`penstroke.app` is **not yours.** It resolves to Cloudflare and redirects to `arkane-labs.cloudflareaccess.com`, an access gate belonging to someone else. `DEPLOY.md:12` still says "Domain: penstroke.app (TBD)" and your Vercel account holds zero domains. Every doc that promises penstroke.app is aspirational.

Because Clerk production needs a domain, the domain choice gates working auth. Cheapest real option: a subdomain of a domain you already control.

## 2. The name

`Vellum` is owned by Vellum AI, YC W23, $20M Series A in July 2025. Your own `name-hunter` skill already records this collision. `Penstroke` reads as prose polish, which is the category the product is explicitly trying not to be in. If the product ships publicly it needs a third name. The repo can stay `vellum` forever; that costs nothing.

## 3. Docs that claim things the code does not do

`README.md:46` is the most damaging line in the repo:

> "Eval-gated deploys. Braintrust nightly regression on claim-detection + contradiction-detection. CI blocks deploys that drop more than 0.05 below baseline."

Verified false on all four counts. `.github/workflows/eval.yml` triggers on pull_request and workflow_dispatch only, with **no** `schedule:`. There is no contradiction eval, only `claim-detector.eval.ts`. There is no `evals/baseline.json`. The "Regression gate" step is literally an `echo` saying the gate is not yet wired.

A technical reader who opens that file stops trusting the rest of the README. Either wire the gate or rewrite the claim. Same class of problem: `README.md:7` embeds `docs/screenshots/hero.png`, which does not exist in the repo, and `README.md:9`, `:78`, `:125` all say the deploy is pending when it is in fact live.

## 4. Local install is broken, and the fix is one command

`node_modules` is full of Windows junctions whose absolute targets point at `C:\Users\Angel\projects-build\vellum\vellum-app\...`. That path no longer exists; the repo moved to `C:\Users\Angel\portfolio\vellum`. Windows junctions store absolute paths, so every top level link dangles and Next fails to resolve its own internals.

```bash
cd vellum-app && rm -rf node_modules && pnpm install
```

Nothing is wrong with the lockfile or the pnpm version.

## 5. Models: one line changes, and one silent bug

Tier 1 stays. There is no Haiku 5; `claude-haiku-4-5` is still the fastest documented model and is not deprecated.

Tier 2 moves: `claude-sonnet-4-6` to `claude-sonnet-5`, one constant in `src/ai/client.ts:6`. Two cautions. Sonnet 5 rejects `temperature`, `top_p`, and `top_k` with a 400, so strip them if present. Sonnet 5 also uses a tokenizer that produces roughly 30 percent more tokens for the same text, so cost rises about 30 percent at identical per-token pricing. Neither current model is deprecated and there is no migration deadline.

**The silent bug.** Prompt caching on Haiku 4.5 has a **4,096 token minimum**. Your tier 1 system prompts are far below it: claim-detector about 344 tokens, intent-checker about 429, synonyms about 85. All three set `cache_control: {type: 'ephemeral'}`, and all three are almost certainly caching nothing. There is no error for this; the API returns zeros for both cache fields. Since claim detection runs on every paragraph edit, this is the hottest path in the product. Confirm with the `cache-diagnosis-2026-04-07` header, which returns `cache_miss_reason`, then either pad the shared prefix past 4,096 tokens or drop the cache_control and stop paying the 1.25x write multiplier for nothing.

Worth adopting, all new since April:
- **Structured outputs** (`output_config.format` plus the `zodOutputFormat` helper) replaces the current "JSON only" prompt plus `stripFences()` plus zod parse. Supported on both tiers. Note that citations and structured outputs cannot be combined in one call, so the verifier would need two.
- **Server-side web search** (`web_search_20260318`) can replace hand-rolled Exa plumbing in the verifier, with citations always on.
- **Citations with `search_result` blocks** attach real source attribution to your own bibliography chunks, and cited text does not count toward token usage.
- **Batch API** at 50 percent off fits background verification, which is already off the request path.

Good news from the audit: the codebase uses **no prefilled assistant messages**, so the 400-on-prefill breaking change does not touch it. The one assistant-role push in `verifier.ts:185` is a normal tool loop.

## 6. Dependencies: milder than expected

Nothing here is a crisis. Current versus yours: Next 16.2.4 to 16.3.0, React 19.2.4 to 19.2.8, Tailwind to 4.3.3, Tiptap 3.22 to 3.29.2, Yjs to 13.6.32, Trigger.dev 4.4.4 to 4.5.10. Drizzle has not moved at all, and neither has Langfuse. pgvector upstream is 0.8.6 but Azure Flexible Server still ships 0.8.2, so that upgrade is not available to you anyway. Apache AGE is actively maintained, 1.8.0 in July 2026.

Two real majors, both optional and both isolated:
- **pnpm 10 to 11** (April 28, days after you stopped). Requires Node 22+, moves every non-auth setting out of `.npmrc` into `pnpm-workspace.yaml`, and defaults `minimumReleaseAge` to one day. Do it alone, with the codemod.
- **TypeScript 6 to 7**, the native Go port. Its own task.

One 30 second safety check, already run for you and **clean**: a stray `middleware.ts` alongside `src/proxy.ts` would be silently ignored by Next 16, meaning `clerkMiddleware` never runs and protected routes go public with no error. Checked: `src/proxy.ts` is the only one, no stray file.

## 7. Market: the window is open, but closing on one side

The thesis "everyone polishes prose, nobody models the argument" was clean in April and is cracked now.

- **IntelliProof** (AAAI demo track, January 2026, arXiv 2511.04528) published essentially this spec: claims as nodes, evidence as properties, edges encoding support and attack, LLM classified and scored. It analyzes finished essays; it is not an authoring surface.
- **Clearbrief** is the closest shipped product, with semantic match scores and unsupported-assertion flagging, but it is Word based and legal vertical.
- **Scite** has had typed supporting and contrasting citation edges since 2019, at index level, never in an editor.
- New since April: Veru, GPTZero's hallucination detector, CiteCheck, and Newton, which may ship argument mapping in a reading tool (unverified, their site blocked the fetch).

Demand signals are strongly up: arXiv began banning authors for unchecked AI content in May 2026, the AI hallucination case database sits around 1,868 court cases and grows roughly eight a day, and EU AI Act Article 50 transparency obligations became applicable on 2 August 2026.

What nobody has shipped is the specific combination: typed claim nodes created **at write time in the primary authoring surface**, verified against **the writer's own bibliography**, with **cross-paragraph contradiction detection** over the graph, general purpose rather than one vertical. That is still open.

The real threat is not a startup, it is Microsoft. Word's Deep Citations goes GA in September 2026, which walks the default word processor toward claim-to-source linkage. Citation linking is commoditizing this quarter. The defensible part is the graph: structure, contradiction, reconciliation.

## Order of work

Items 1 and 3 through 6 were done on 2026-08-11; see "Done" below. What is left needs your accounts:

1. **Decide the domain.** Working auth waits on it, and so does the name decision.
2. **Stand up a Clerk production instance** on that domain, then put `pk_live_` and `sk_live_` into the Vercel project's environment variables and redeploy. This is the only thing standing between the app and a working sign-in.
3. Dependency batch: Next, React, Tailwind, Tiptap, Trigger.dev together.
4. pnpm 11, then TypeScript 7, each alone.
5. Only then: structured outputs, server-side web search, batch verification.

## Done 2026-08-11

- `node_modules` rebuilt; `pnpm typecheck` and `pnpm build` both pass again.
- `MODELS.REASONING` moved to `claude-sonnet-5`, with pricing for both entries so cost accounting keeps working on old rows.
- Added `shouldCacheSystem()` in `src/ai/client.ts` and applied it in `claim-detector`, `intent-checker`, and `synonyms`. Those three prompts are far under Haiku's 4,096 token cache floor, so they no longer ask for a cache write that could never be read.
- Scorers extracted to `evals/scorers.ts`, shared by the Braintrust eval and a new `evals/gate.ts`. `pnpm eval:gate` scores the gold set, writes `evals/results.json`, establishes `evals/baseline.json` on first run, and exits 1 when any score falls more than 0.05 below it. `.github/workflows/eval.yml` now runs that instead of an `echo`.
- README corrected: the eval claim now describes what the code does, the broken `hero.png` embed points at the architecture diagram that exists, the deploy lines say live, and the model names match the code.

**Not yet run:** `pnpm eval:gate` has never executed, because it needs the live database and an Anthropic key. Its first CI run on a pull request touching `src/ai/**` will establish the baseline. Until then the gate is real code that has not been exercised.

## What this does not touch

Rebuilding anything. The architecture held up. One Postgres for relational, graph, and vector is still a good call, the two-tier routing is still the right shape, and the scope cuts documented in the README are still the right cuts.
