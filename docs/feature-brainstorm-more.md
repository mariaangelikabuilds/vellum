# Vellum — 25 more features (stray-from-core edition)

> Companion to `feature-brainstorm-20.md`. These wander further from the claim-graph spine
> into general writing-tool / publishing-platform / research-environment utility.
> Some are table-stakes; some are weird. Effort + audience tags as before.

---

## VIII. Writing experience (the surface stuff that makes daily use feel good)

### 21. Focus mode
Full-screen, all chrome hidden, just paper + cursor + a discreet word counter in the corner. Press `Esc` to exit. The argument map and side-pane retreat; pure prose surface.
**Why Vellum:** Long-form writers need flow state. Without focus mode the editor reads as "always-on assistant" — sometimes you just want to draft.
**Effort: S · Audience: ALL**

### 22. Pomodoro / writing-session timer
Click a flame icon → 25-min countdown starts → at the bell you get a tiny ledger showing what was written that session (word count, new claims, claims verified, contradictions found). Optional streak tracking.
**Why Vellum:** Writers need rhythm tools. The session ledger is Vellum-distinctive — no other writing tool can show you "claims verified per 25 min" because no other tool tracks claims.
**Effort: S · Audience: ESS, JNL**

### 23. Templates
Pre-structured starter docs: *academic paper* (intro/methods/results/discussion), *op-ed* (hook/argument/counter/return), *briefing memo* (TL;DR/findings/recommendation), *literary essay* (no structure imposed). Each template seeds the argument map skeleton — slots wait for claims.
**Why Vellum:** Researcher + journalist audiences expect templates. The Vellum twist: templates aren't just headings, they're *empty argument-map slots* with hints ("a counterargument goes here").
**Effort: M · Audience: RES, JNL**

### 24. Markdown import/export
Paste markdown → get a Vellum doc with claims auto-extracted on save. Export any doc back to clean markdown with claim ranges preserved as inline citations. Two-way.
**Why Vellum:** Markdown is the lingua franca for writers. Friction-free in/out lowers the cost of trying Vellum. Power-user demand for export.
**Effort: M · Audience: ALL**

### 25. Slash menu (`/`) + keyboard shortcuts
`/heading`, `/footnote`, `/cite`, `/figure`, `/quote`, `/divider`. Plus `Cmd+K` command palette ("verify claim", "outline this", "open argument map"). Minimal, keyboard-first chrome.
**Why Vellum:** Power users adopt fast when keyboard exists. Researchers/journalists are largely desktop-keyboard people.
**Effort: S · Audience: ESS, RES, JNL**

---

## IX. Content management (the library half)

### 26. Search across all your essays
Full-text search PLUS claim search. "Find every essay where I claimed X." "Find essays citing arxiv:1234." Backend: pgvector + claim graph traversal. UI: a `Cmd+P` quick-open style search bar.
**Why Vellum:** Vellum has more structured data per doc than any other writing tool. The search affordance has to match — searching by *claim*, not just words, is a Vellum-only superpower.
**Effort: M · Audience: ESS, RES**

### 27. Tags + collections
Tag essays by topic (`/policy`, `/ai`, `/2026-q1-research`), project, or status (`draft`, `published`, `revisiting`). Collections group multiple essays into a body of work — the basis for compiling a book or thesis later.
**Why Vellum:** Researchers organize by project; journalists by beat; essayists by recurring theme. Universal need.
**Effort: S · Audience: ALL**

### 28. Version history with claim diffs
Open v1 vs v2 side-by-side. Word diff at the bottom (standard); **claim diff at the top**: "in v1 you claimed X, in v2 you backed off." Restore any version. See how the argument shifted.
**Why Vellum:** Word diffs are everywhere. Claim diffs only exist because Vellum stores claims as structured data. This is the kind of feature that makes researchers say "wait, can I see how the argument changed?"
**Effort: M · Audience: RES**

### 29. Inbox / drafts queue
A separate "scratch" lane for half-formed ideas, captured fast. Promote any item → becomes a full doc with the captured text as the seed paragraph. Like a writer's commonplace book.
**Why Vellum:** Most ideas die because they had nowhere to go. The inbox is the funnel into real essays. Lo-fi capture → high-fi structure.
**Effort: S · Audience: ESS, JNL**

### 30. Bibliography manager (Zotero-grade)
Per-essay bibliography is fine, but at writer-level you accumulate a reference library. Browse, organize, dedupe, export to BibTeX/RIS, link a source to multiple essays. Drop URLs / DOIs / PDFs in.
**Why Vellum:** Researchers pay for Zotero. Vellum bundles bibliography into the writing surface where it actually matters. Reduces tool-switching tax.
**Effort: M · Audience: RES, JNL**

---

## X. Collaboration (the multiplayer layer)

### 31. Live multi-user collab
Yjs is already wired. Add presence cursors, named edits, comments. Two writers on one doc, like Google Docs but with shared claim graph.
**Why Vellum:** Co-authored essays / co-reported journalism / co-written research papers all happen. The technical groundwork is done; just needs UX.
**Effort: M · Audience: JNL, RES**

### 32. Inline comments + marginalia
Highlight any text → comment in the gutter (like Google Docs). Comments persist on published essays — readers see comment threads alongside the prose.
**Why Vellum:** Editorial workflow. Editor leaves notes, writer revises, thread closes. Standard in newsroom / academic editing.
**Effort: S · Audience: JNL, RES**

### 33. Roles + permissions (orgs)
Clerk org mode is wired. Surface it: editor / writer / reviewer / read-only roles. Newsroom signs up as an org, assigns reporters as writers, editor as reviewer. Vellum becomes the newsroom CMS.
**Why Vellum:** Unlocks B2B sales (newsrooms, research labs, magazines). Per-seat pricing.
**Effort: M · Audience: JNL, RES (B2B)**

---

## XI. Publishing & monetization

### 34. Substack-style newsletter publishing
Vellum doc → emailed to your subscriber list as a verified essay. Subscribers see claim underlines + sources. Mailgun/Resend already in stack.
**Why Vellum:** Substack is the gravity well; competing for the writer is hard. Bundling Vellum-with-newsletter is easier than asking writers to leave Substack.
**Effort: M · Audience: ESS**

### 35. Embed code for any blog
Each Vellum essay gets a `<script>` snippet bloggers can paste into their own site. The essay renders inline with live claim graph + hover sources. Works on Medium / Ghost / WordPress / static sites.
**Why Vellum:** Pure distribution. Every embed is a referral loop. Writers don't have to leave their existing platform.
**Effort: M · Audience: ESS, JNL**

### 36. Tip jar / paid essays / patron subscriptions
Readers tip $1-$50 for specific essays they value. Or subscribe $5/mo to a writer's full archive. Stripe is wired. Vellum takes 5% (cheaper than Substack's 10%).
**Why Vellum:** Direct creator monetization without leaving the platform. Vellum-as-Substack-competitor.
**Effort: M · Audience: ESS, JNL**

### 37. Audio version (TTS) of every published essay
Every published essay gets a clean text-to-speech rendition (ElevenLabs or OpenAI voices). Listenable on commute. Reader picks "read" or "listen."
**Why Vellum:** Reading happens on mobile but writers focus on desktop. Audio rescues the mobile audience.
**Effort: S (ElevenLabs API) · Audience: READ**

---

## XII. AI assistance beyond verification

### 38. Auto-summary / TL;DR
Every published essay gets an auto-generated TL;DR (Sonnet, regenerated when prose changes substantially). Reader sees a 3-sentence summary above the essay; can expand to read full.
**Why Vellum:** Discovery surface. Readers scan TL;DRs in the catalog before clicking through.
**Effort: S · Audience: READ**

### 39. AI co-writer with claim discipline
Sonnet types alongside you, suggesting next sentences. Crucial difference from generic AI writers: **every suggested claim is run through the verifier before being shown.** Vellum will not autocomplete a hallucinated fact.
**Why Vellum:** Defensible AI use. Anti-AI-slop positioning. The verifier-gated autocomplete is genuinely Vellum-only.
**Effort: L · Audience: ALL**

### 40. Translation with claim preservation
Write in English. One click → essay translated to Spanish/Tagalog/Mandarin with claim ranges preserved. Each translated claim still links to the original source.
**Why Vellum:** Global readership without losing verifiability. Researchers + journalists with international audiences benefit hugely.
**Effort: M · Audience: ESS, JNL, RES**

### 41. Personal style fingerprint enforcement
Vellum analyzes your last 10 essays, builds a "voice profile." When you draft something off-voice, it flags ("this paragraph reads less like your March essay and more like an academic press release"). Optional, off by default.
**Why Vellum:** Voice consistency is craft-level concern. The graph-of-claims data + writer's archive makes this analyzable in a way no generic tool can.
**Effort: M · Audience: ESS**

---

## XIII. Wild bets / future-tense

### 42. Vellum API
A documented API for the claim engine. Other tools (Substack, Notion, Obsidian) can call Vellum to verify claims in their content. Per-call pricing.
**Why Vellum:** Becomes infrastructure. Anthropic-of-fact-checking. Long-term defensibility — competitors using your engine.
**Effort: L · Audience: developers**

### 43. Vellum Cohorts / writing courses
Host paid writing cohorts on the platform. A teacher (Yglesias / Hanania / Bari Weiss) runs a 6-week essay-writing cohort; students draft in Vellum, submissions are graded against the claim graph. Stripe handles the seats.
**Why Vellum:** Education vertical. High revenue per student. Validators (famous teachers) bring their audiences as students who become writers.
**Effort: L · Audience: ESS (students + teachers)**

### 44. Argument simulator (practice mode)
Adversarial AI agents debate your claim from multiple perspectives. Practice defending your thesis before publishing. "What would a skeptic / a defender / a Marxist / a libertarian say to this?"
**Why Vellum:** Pre-publication courage tool. Closest thing to having a hostile editor on demand. Distinctive AI use.
**Effort: L · Audience: ESS, RES**

### 45. Vellum Essays — the publication
Curated essays from the platform, edited by humans, hosted at `essays.vellum.dev`. Anchors the brand the way Stripe Press anchors Stripe. Writers want to be *in* Vellum.
**Why Vellum:** Brand validator + recruiting tool + network effect. The publication is the marketing engine.
**Effort: L (editorial team) · Audience: ALL**

---

## How this list shifts the picture

Compared to the original 20, this set adds:

- **B2B revenue paths** (#33 orgs/roles, #43 cohorts, #42 API) — newsrooms, schools, dev tools
- **Creator-monetization paths** (#34 newsletter, #35 embeds, #36 tip jar/subscriptions) — direct revenue for writers
- **Research-grade tooling** (#28 claim diffs, #30 bibliography manager, #40 translation) — the PhD/journalist daily tax
- **Content management primitives** (#26 search, #27 tags, #28 version history, #29 inbox) — what makes a tool a *daily driver*, not a once-an-essay tool
- **Mobile/audio reach** (#37 TTS) — finally serves the mobile audience the editor refuses to

If picking 5 from THIS list to add on top of the original 20's top-5:

1. **Search across all your essays** (#26) — daily-driver multiplier
2. **Tags + collections** (#27) — table-stakes that's missing
3. **Substack-style newsletter publishing** (#34) — distribution lever
4. **AI co-writer with claim discipline** (#39) — the most Vellum-distinctive use of AI
5. **Vellum API** (#42) — long-term moat / infrastructure positioning

That gets v2.0 from "useful tool" to "category-defining platform."
