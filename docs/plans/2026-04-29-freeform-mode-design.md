# Freeform mode, design

**Date:** 2026-04-29
**Status:** Approved direction. Implementation in phases starting today.

## The product thesis

Two modes, same product, two halves of one question about writing:

| Mode | The question it asks | Detection target |
|---|---|---|
| **Researcher** (current default) | *Are these claims true?* | claims, evidence, contradictions |
| **Freeform** (new) | *Is this draft true to what I meant?* | intent-coherence, flat lines, hedges, tonal drift |

The brand thread: **"Say what's true" / "Say what you mean."** Researcher mode for the head; freeform mode for the gut. Both are about a kind of truthfulness, factual or emotional.

## Why this angle (vs grammar/clichés/AI-tells)

Grammar tools are a saturated commodity (Grammarly, Hemingway, Notion AI). AI-tell detectors exist (GPTZero, Originality). None of them ask the question that actually matters for personal writing: *did you say what you meant?*

A letter to a loved one is hard not because of grammar. It's hard because the words are easy and the meaning is hard. The tool that helps with the *meaning* problem is novel and emotionally resonant.

This expands the product TAM dramatically (essayists, journalists, researchers, plus anyone writing captions, letters, eulogies, apologies, pitches, declarations) without diluting the brand. Both modes are about disciplined truth-telling.

## The mechanic, how intent-coherence works

When a user creates or opens a freeform doc:

1. **Intent field** at the top of the doc, one sentence. Replaces the title or sits above it. Examples:
   - *"I want my mom to know I noticed her this year."*
   - *"I want this caption to make people stop scrolling."*
   - *"I want her to know I'm sorry without saying sorry."*
   - *"I want this thank-you to feel earned, not polite."*

2. **AI reads the draft against the intent.** Two-tier routing (same as researcher mode):
   - **Haiku** does the first pass. Flags passages that don't carry the intent.
   - **Sonnet** verifies the higher-stakes calls (drift, miss, lands).

3. **Four mark types** in freeform mode (each describes what the sentence *does*, parallel verb forms):
   - `<miss>`, line is technically correct but doesn't *do* what the intent said
   - `<bury>`, softening or burying the real thing ("I just wanted to maybe..."). Echoes the copy-desk idiom "buries the lede".
   - `<drift>`, tonal mismatch with the declared register (cold line in tender piece)
   - `<land>`, line *does* hit the intent (positive mark, celebrates, doesn't just correct)

4. **Voice tab** in the right rail (replaces Marks/Map/Critique tabs). Lists flagged passages with the AI's read of why each one misses, plus a suggested rewrite.

## Architectural shape (reuses existing plumbing)

| Researcher mode component | Freeform mode equivalent |
|---|---|
| Tiptap editor with `claim`/`evidence`/`question` marks | Same Tiptap editor with `flat`/`hedge`/`drift`/`lands` marks |
| `/api/detect-claims` (Haiku, then Sonnet two-tier) | `/api/text/intent-check` (same two-tier) |
| `documents.claimCount` column | Reuse `claimCount` as a generic mark count |
| Marks/Map/Critique tabs in right rail | Voice tab (and later Pulse tab) |
| `documents.title` | New `documents.intent` field stored on the row |

No new editor framework, no new model providers, no new mark architecture. Just different Tiptap mark types and different prompts on the same two-tier model routing.

## Data model changes

Single migration on the `documents` table:

```sql
ALTER TABLE documents ADD COLUMN mode TEXT NOT NULL DEFAULT 'researcher'
  CHECK (mode IN ('researcher', 'freeform'));
ALTER TABLE documents ADD COLUMN intent TEXT NULL;
```

- `mode`, which lens. Default `researcher` keeps existing docs unchanged.
- `intent`, only populated for freeform docs. Nullable so researcher docs cost nothing.

The `claimCount` column stays as-is for researcher docs. For freeform we reuse it as a generic "marks count" to avoid schema sprawl. Rename in v2 if needed.

## Mode toggle UX

**Toggle placement: per-document, switchable any time.** The user picks researcher or freeform when creating a doc, and can switch later via a small pill switch in the document header.

What happens on a switch:
- **Researcher to freeform**: existing claim/evidence/question marks persist as static (no new claim detection, but old marks stay visible). Intent field appears, becomes editable. Right rail switches from Marks/Map/Critique to Voice.
- **Freeform to researcher**: existing flat/hedge/drift/lands marks persist as static. Intent field is hidden but data is preserved. Right rail switches back.

Mode is per-document because the user's stated rationale is "I have both kinds of writing on different days." A global mode setting would force a context switch they don't want; a per-paragraph mode would be UX overkill.

## API routes

**New:**
- `POST /api/text/intent-check`. Body: `{ documentId, paragraphId?, text, intent }`. Returns: `[{ start, end, kind: 'flat'|'hedge'|'drift'|'lands', why, suggestion? }]`. Two-tier model (Haiku detects, Sonnet verifies non-trivial flags).
- `POST /api/documents/[id]/intent`. Set or update the document's intent.

**Modified:**
- `POST /api/detect-claims`. Gate at the top: if `doc.mode === 'freeform'`, return early with no claims (don't run claim extraction).
- `POST /api/documents/new`. Accept optional `mode` param, default `researcher`.

**Unchanged but newly conditional in UI:**
- `/api/documents/[id]/argument-map`, `/critique`, `/find-contradictions`, `/outline`, `/cowrite`, `/bibliography`. Server keeps these working for any doc; UI just hides the buttons in freeform mode.

## UI changes

- **`/app/doc/[id]` document header**: add a Researcher/Freeform pill switch next to the title.
- **Intent field**: appears at the top of the editor canvas in freeform mode only. Single-line input with example placeholder cycling on focus (the four examples from "The mechanic" above).
- **Right rail tabs**: in researcher mode, current Marks/Map/Critique. In freeform mode, **Voice** tab (and later Pulse). Other tabs hidden.
- **Empty state copy** in the editor: in researcher mode, "Start writing." In freeform mode, "Start writing, and tell me what you mean above."

## Landing page changes

Hero copy gets a second sentence:

> A graph-of-claims word processor for serious writing. Say what's true in **researcher mode**, say what you mean in **freeform mode**.

Demo section gets a freeform vignette: write a flat birthday card, declare an intent, watch the flat lines flag, rewrite, see them turn green. 30-second loop, autoplaying on the landing page.

## Implementation phases

### Phase 1, MVP (target: ship in 2 days, before 2026-05-01)
- DB migration: `mode` and `intent` columns.
- Mode toggle UI in document header.
- Intent field component.
- `/api/text/intent-check` route, Haiku-only first pass (skip Sonnet verify in MVP).
- One mark type aggregation `<intentMark kind="...">` for flat/hedge/drift/lands.
- Voice tab listing flagged passages.
- Gate `/api/detect-claims` on `doc.mode`.
- Hide researcher-mode tabs when `mode === 'freeform'`.

### Phase 2, polish (target: ship by 2026-05-08)
- Add Sonnet verification for higher-stakes flags (drift, miss).
- "Lands" positive marks, celebrate the hits.
- Suggested rewrites in the Voice tab, click to apply.
- Intent presets: dropdown with templates (love letter, apology, caption, eulogy, pitch, etc.).
- Landing page section and demo loop.

### Phase 3, stretch (post-2026-05-15)
- Pulse tab: sentence rhythm, reading-aloud cadence, readability.
- Compound intents (multiple intent lines per doc).
- Saved intents library.
- Mode-specific export templates.

## Known dependencies and risks

- **Auth still has the third-party-cookie problem.** Recruiters can't easily sign up to try freeform mode until the Clerk production migration lands. Decision: ship freeform anyway; the auth migration unblocks separately.
- **AI prompt quality.** The intent-coherence detection is harder to get right than claim detection. If the AI is wrong too often (calls warm lines "flat" or vice versa), users lose trust fast. Mitigation: tight eval set (10 known-good cases) and ability to dismiss any flag inline.
- **Cold start for the user.** The intent field is the load-bearing UI element. If users skip it or write a vague intent, the AI has nothing to anchor on. Mitigation: empty intent triggers AI to return "Tell me what you're trying to do, and I'll show you what's working" instead of running on no-input.

## Out of scope for this design

- Auth migration (separate plan, blocked on domain decision).
- Codebase rename from "Vellum" (separate plan, blocked on brand decision).
- Researcher-mode v1.6 security batch (paused while freeform ships).
- Multi-language freeform support (English-only for MVP).
- Voice cloning or per-user voice fingerprinting (Phase 3+ if pursued).
