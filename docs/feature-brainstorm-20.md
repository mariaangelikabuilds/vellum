# Penstroke — 20 features brainstorm

> Generated 2026-04-25 during the design session, post-typewriter implementation.
> Sorted by category, not priority. Effort tags: S = a session, M = a few days, L = a sprint.
> Audience tags: ESS (essayist), JNL (journalist), RES (researcher), READ (reader), ALL.

---

## I. Writer's craft (the daily-tool layer)

### 1. Argument map view ★
A second tab on the doc surface rendering claims as a logical tree: premises → conclusions, with counterarguments as siblings, evidence as children. Live-updating as you type. Drag to reorganize argument flow without touching prose.
**Why Penstroke:** AGE already stores typed claims + edges. The map IS the data made visible. The "graph database becomes the UI" payoff is the case-study punchline.
**Effort: M · Audience: ALL**

### 2. Reverse outline gesture
Select any paragraph → right-click → "outline this." Sonnet returns the bullet-point structure of what you just wrote. Tests coherence in 2 seconds.
**Why Penstroke:** Reverse outlining is a known craft technique nobody has automated well. Penstroke's claim extractor is 80% of the work already.
**Effort: S · Audience: ESS, RES**

### 3. Critic mode (agent already written)
One-click "review this." Sonnet reads as a hostile NYRB editor and marks every weak premise, leap-in-logic, missing counterargument, overclaim. Inline annotations like a marked-up manuscript. Loop until clean.
**Why Penstroke:** Defensible AI use ("not write for me, tell me what's broken"). Pre-publication paranoia is universal. People will pay for this.
**Effort: M · Audience: ALL**

### 4. Counter-argument / steelman generator
Per-claim button: "what's the strongest objection?" Sonnet steelmans the opposing view. Optional: "what would [Hanania / Yglesias / Klein] say to this?"
**Why Penstroke:** Pre-publication courage tool. The graph-of-claims structure makes per-claim invocation natural.
**Effort: S · Audience: ESS, JNL**

### 5. Slash commands inside the editor
`/verify` runs the verifier on the current paragraph. `/critique` runs critic mode on selection. `/reconcile` invokes the reconciler. `/outline` returns the reverse outline. Notion-style command palette but every command is a Penstroke agent.
**Why Penstroke:** Power-user surface. Once writers internalize the commands, Penstroke becomes a daily-driver, not a once-an-essay tool.
**Effort: M · Audience: ALL (advanced)**

---

## II. Reader experience (the audience-multiplier layer)

### 6. Reader mode — Penstrokeize any URL
Paste any web page URL. Penstroke fetches, extracts claims, runs the verifier, renders the argument graph. Use it to read the news critically, audit a competitor's white paper, fact-check a Twitter thread.
**Why Penstroke:** Readers outnumber writers 100:1. Reader mode is the trojan horse for adoption — readers see the value, become writers, the loop closes.
**Effort: L · Audience: READ (huge market)**

### 7. Public viewer route `penstroke.app/v/[slug]`
Anonymous reading of essays published from Penstroke, with claim underlines, hover-source-cards, argument map (collapsed by default), "verified by Penstroke on YYYY-MM-DD" badge. Zero login required.
**Why Penstroke:** The distribution layer. Every published essay is a marketing surface. URL becomes shareable on Twitter/LinkedIn with the embedded claim graph as social proof.
**Effort: M · Audience: ALL (writers + readers)**

### 8. Reader annotation / claim disputes
On any published Penstroke essay, readers can hover a claim and click "challenge." Their evidence + the writer's evidence go to a verifier agent that adjudicates. The claim gets a public verdict (supported / disputed / inconclusive). Hypothes.is meets Wikipedia talk pages, but graph-aware.
**Why Penstroke:** Network effect. Readers contribute, claims get more rigorously verified, the platform gets smarter. Plus: it's something no other writing tool can do because they lack the graph layer.
**Effort: L · Audience: READ + ESS**

### 9. Browser extension "Penstrokeize this page"
Install once. On any article you read, click the toolbar icon → opens a side panel rendering the argument graph + flagging contradictions. Free version: 5 articles/day. Pro: unlimited + saves to your library.
**Why Penstroke:** Audience multiplier without the writers having to do anything. Distribution flywheel — extension users see Penstroke quality every day, eventually want to write *in* Penstroke.
**Effort: L (Chrome/Firefox APIs) · Audience: READ**

---

## III. Verification depth (the trust layer)

### 10. Auto-bibliography paste-URL
Paste a URL into the bibliography pane. Penstroke fetches the page, extracts the main content, embeds it via Voyage, indexes it. The verifier can now cite from it. Drop-and-go.
**Why Penstroke:** The single biggest UX hole today is "type your bibliography manually." This closes the loop between research and writing.
**Effort: M · Audience: RES, JNL**

### 11. Time-aware claim decay
Claims have a lifespan. "Anthropic's prompt caching reduces cost by 90%" was true in 2025. Pricing changes. Penstroke's verifier re-checks published claims weekly against the current web; flags claims whose evidence has decayed. Email digest: "3 claims in your March essay need revisiting."
**Why Penstroke:** Differentiates from static fact-checking tools. Writers come back to update old essays. Compounding lock-in.
**Effort: M · Audience: ESS, JNL, RES**

### 12. Citation network visualization
A view showing every source in your bibliography, sized by how often you cite it, edges between sources that cite each other (when extractable). See your research patterns. Detect echo chambers.
**Why Penstroke:** Diversity-of-evidence audit. "You've been citing exclusively from arxiv.org for the last 5 essays." Useful for journalists especially.
**Effort: M · Audience: RES, JNL**

---

## IV. Distribution / publishing

### 13. Substack / Ghost / Medium integration
"Publish to Substack" button. Exports the prose with claim underlines preserved as inline links + a "verified by Penstroke" footer with a penstroke.app/v/[slug] link to the full graph.
**Why Penstroke:** Meets writers where they already publish. Becomes additive, not competitive.
**Effort: M · Audience: ESS**

### 14. Embed widget
A `<script>` tag any blog can paste to render their claim graph inline. Substack post → readers can hover claims and see sources without leaving Substack.
**Why Penstroke:** Pure distribution. Every embed is a referral loop.
**Effort: M · Audience: ESS, JNL**

### 15. AI-detection inversion / human authorship proof
Every essay published from Penstroke carries an "editing trace": agent calls made, suggestions accepted, suggestions rejected, time spent per paragraph. Cryptographically signed. Counter-positioning to the AI-slop wave: *prove* a human did the thinking.
**Why Penstroke:** The 2026 zeitgeist is "is this AI-written?" Penstroke offers the inversion: a human-authorship receipt. No competitor has this.
**Effort: M · Audience: ALL**

---

## V. Reputation / longitudinal (the platform layer)

### 16. Drafts library / claim-accuracy dashboard
Personal page showing every essay over time with metrics: claims verified, contradictions resolved before ship, claims that have decayed since publication, your "verifiability score." Public profile optional.
**Why Penstroke:** Status signal. "I write essays in Penstroke and my claim-accuracy is 94%" becomes a thing. Attaches reputation to verifiability.
**Effort: M · Audience: ESS, JNL**

### 17. Personal claim library (cross-essay knowledge graph)
Every claim you've ever written + verified stays in your personal graph. New essay starts with "you've already established X in your March piece — link to that?" After 50 essays, you have a personal knowledge graph no one else has.
**Why Penstroke:** Long-term lock-in. The graph compounds in value. Switching cost approaches infinite after a few years of use.
**Effort: L · Audience: ESS, RES**

---

## VI. Workflow / power-user

### 18. Voice-to-claims dictation
Click record. Walk and talk through your argument. Whisper transcribes. The claim-detector runs over the transcript. Claims appear in the graph; you assemble the prose later from the structured pieces.
**Why Penstroke:** Captures thinking when it's freshest (in motion, off the keyboard). Researchers + journalists love voice memos. Distinctive vs. all other writing tools.
**Effort: M (Whisper API + claim pipeline reuse) · Audience: JNL, RES**

### 19. Comparison view between drafts
Open v1 and v2 side-by-side. The diff is not text-level but **claim-level**: "in v1 you claimed X, in v2 you backed off." Track how the argument evolved, not just the words.
**Why Penstroke:** Only possible because we have structured claims. Word-diff tools can't do this. Researchers comparing drafts of a paper would kill for it.
**Effort: M · Audience: RES**

---

## VII. Big-bet directions (one each, future-tense)

### 20. Penstroke Essays — the publication
Beyond the platform: Penstroke becomes a curated publication. Best-of essays from the platform, edited by humans, hosted on `essays.penstroke.app`. Anchors the brand the way Stripe Press anchors Stripe. Writers want to be published *in* Penstroke.
**Why Penstroke:** The publication is the marketing engine + the brand validator + the network effect. Every essay published is a recruiting tool for both writers and readers.
**Effort: L (editorial team, curation pipeline, publication design) · Audience: ALL**

---

## How to read this list

The 20 fall into roughly 3 groups by repeat-use:

- **Daily drivers (1, 3, 5, 16, 17):** the user opens Penstroke because of these
- **Pre-publication rituals (2, 4, 11, 19):** invoked once per essay, but every essay
- **Distribution / reach (6, 7, 8, 9, 13, 14, 15, 20):** the audience-multiplier moves

If picking the top 5 to build alongside the existing v1, my pick:

1. **Argument map** — case-study punchline, demo unlock
2. **Public viewer route** — distribution layer, marketing flywheel
3. **Reverse outline** — daily-driver, ships in a session
4. **Auto-bibliography paste-URL** — biggest UX hole, fastest user value
5. **Critic mode** — agent already written, finishes the trifecta with #1 + #16

That's a v1.5 that goes from "demo" to "tool people return to."
