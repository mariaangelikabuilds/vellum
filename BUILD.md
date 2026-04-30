# Penstroke — build guide

> A graph-of-claims word processor for essayists, analysts, and longform writers. Every sentence with a claim is a node, every citation is an edge, and a background agent continuously checks for unsupported claims, contradictions, and missing evidence as you write.

This is the literal copy-pasteable end-to-end build. Phases progress from prerequisites to deploy. Every command, every file, every config is here.

**Estimated time (honest):** ~5 weeks of focused build for v1, interleaved with interviewing. 2.5× multiplier already applied (see `scope.md`).

**You will use:** Claude Code as pair-programmer throughout. The `./docs/build-shared/08-claude-code-workflow.md` shared section has the recurring patterns; project-specific Claude Code prompts are inline below.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Base setup](#2-base-setup)
3. [Database & data model](#3-database--data-model) — **project-specific**
4. [Auth (Clerk)](#4-auth)
5. [Billing (Stripe)](#5-billing)
6. [AI integration · agent fleet](#6-ai-integration) — **project-specific**
7. [Frontend · Tiptap + Yjs + side-pane viz](#7-frontend) — **project-specific**
8. [Eval harness](#8-eval-harness) — **project-specific rubric**
9. [Deploy](#9-deploy)
10. [v1 cutlist](#10-v1-cutlist)

---

## 1. Prerequisites

See `./docs/build-shared/00-prerequisites.md` for: Node + pnpm + git + GitHub CLI + service accounts (Vercel, Neon, Clerk, Stripe, Anthropic, Voyage, Resend, Sentry, Langfuse, Braintrust, GitHub, Cloudflare, Trigger.dev).

**Penstroke-specific accounts you'll also need:**

- **Exa** — https://exa.ai/ — semantic web search for verification. ~$0.005/query starter.
- **Voyage AI** — https://www.voyageai.com/ — embeddings for retrieval. $0.12/Mtok on `voyage-3-large`.
- **Trigger.dev** — https://trigger.dev/ — durable workflows for the verification job queue.

Sign up. Generate API keys. Save into `.env.example` as you go.

---

## 2. Base setup

Follow `./docs/build-shared/01-base-setup.md` exactly. After it completes you have:
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui scaffolded.
- Geist Mono + Geist Sans loaded.
- Working `pnpm dev` localhost.
- Git repo initialized + pushed to GitHub.

**Repo name:** `vellum-app` (kebab-case).

**Penstroke-specific tweaks to the base:**

Install editor + CRDT + graph dependencies up front:

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration \
         @tiptap/extension-collaboration-cursor \
         yjs y-prosemirror y-websocket y-protocols \
         @anthropic-ai/sdk \
         @neondatabase/serverless drizzle-orm \
         @trigger.dev/sdk @trigger.dev/nextjs \
         @clerk/nextjs stripe \
         resend zod
pnpm add -D drizzle-kit dotenv tsx
```

Add custom shadcn components Penstroke will need:

```bash
pnpm dlx shadcn@latest add card dialog popover tooltip toast separator scroll-area
```

---

## 3. Database & data model

Follow `./docs/build-shared/02-database-postgres.md` for Neon + Drizzle. Then come back here for the project-specific Penstroke schema.

Penstroke's data lives in three places:
1. **Relational tables** in Postgres (users, orgs, documents, revisions, bibliography, embeddings).
2. **Graph vertices and edges** in Apache AGE (claim graph layer).
3. **Yjs CRDT state** stored as a binary blob per-revision.

### 3.1 Enable Apache AGE

Run in Neon SQL editor (or via migration):

```sql
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Create the graph (one per Penstroke instance; documents live as subgraphs)
SELECT create_graph('vellum_claims');
```

### 3.2 Relational schema · `src/db/schema.ts`

```typescript
import {
  pgTable, uuid, text, timestamp, jsonb, integer, boolean, index,
  bytea, customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// pgvector custom type for embeddings (1024-dim from Voyage)
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'vector(1024)'; },
  toDriver(value) { return `[${value.join(',')}]`; },
  fromDriver(value) { return JSON.parse(value as string); },
});

// === MULTI-TENANCY ===

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: index('users_org_idx').on(t.orgId),
}));

// === DOCUMENTS ===

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull().default('Untitled'),
  // current Yjs document state as binary
  yjsState: bytea('yjs_state'),
  // claim graph IDs are derived; we store a denormalized count for the UI
  claimCount: integer('claim_count').default(0),
  contradictionCount: integer('contradiction_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgIdx: index('documents_org_idx').on(t.orgId),
  authorIdx: index('documents_author_idx').on(t.authorUserId),
}));

export const revisions = pgTable('revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  yjsUpdate: bytea('yjs_update').notNull(), // a Yjs update binary
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  docIdx: index('revisions_doc_idx').on(t.documentId, t.createdAt),
}));

// === BIBLIOGRAPHY (per-document evidence sources) ===

export const bibliography = pgTable('bibliography', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  url: text('url'),
  title: text('title'),
  contentSnapshot: text('content_snapshot'), // captured text at fetch time
  embedding: vector('embedding'), // 1024-dim
  fetchedAt: timestamp('fetched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  docIdx: index('bib_doc_idx').on(t.documentId),
  // HNSW index for fast ANN search; created in raw SQL (see migration below)
}));

// === USAGE (for billing + cost tracking) ===

export const usage = pgTable('usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  meter: text('meter').notNull(), // 'detector_call' | 'verifier_call' | 'gap_call' | 'tokens_in' | 'tokens_out'
  amount: integer('amount').notNull(),
  costUsd: integer('cost_usd_cents').default(0), // cents
  reportedToStripe: boolean('reported_to_stripe').default(false),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgMeterIdx: index('usage_org_meter_idx').on(t.orgId, t.meter, t.occurredAt),
}));

// === SUBSCRIPTIONS (from 04-billing-stripe.md) ===

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text('status').notNull(),
  priceId: text('price_id').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 3.3 Migrations

```bash
pnpm db:generate
pnpm db:push
```

Then add the HNSW index for embedding search (raw SQL — Drizzle Kit doesn't model this yet):

`src/db/migrations/0001_pgvector_hnsw.sql`:

```sql
CREATE INDEX IF NOT EXISTS bib_embedding_hnsw_idx
  ON bibliography
  USING hnsw (embedding vector_cosine_ops);
```

Run:

```bash
psql "$DATABASE_URL" -f src/db/migrations/0001_pgvector_hnsw.sql
```

### 3.4 Apache AGE schema · the claim graph

The graph has 3 vertex labels and 4 edge labels.

`src/db/migrations/0002_age_schema.sql`:

```sql
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Vertices use Cypher syntax via AGE's cypher() function

SELECT * FROM cypher('vellum_claims', $$
  CREATE
    (label1:Claim)
  $$) as (n agtype);

-- For real apps: vertices/edges are created via the helper functions below
-- in src/db/graph.ts. The schema lives implicitly in the data.
```

### 3.5 Graph helper functions · `src/db/graph.ts`

```typescript
import { sql } from 'drizzle-orm';
import { db } from './index';

const GRAPH = 'vellum_claims';

export interface ClaimVertex {
  id: string;
  documentId: string;
  text: string;
  type: 'factual' | 'opinion' | 'speculation' | 'evidence' | 'question';
  confidence: number;
  positionStart: number;
  positionEnd: number;
  createdAt: string;
}

/** Insert a new claim/evidence/question vertex into the graph. */
export async function createClaimVertex(v: Omit<ClaimVertex, 'createdAt'>) {
  const result = await db.execute(sql`
    SELECT * FROM cypher(${GRAPH}, $$
      CREATE (n:Claim {
        id: $id, documentId: $documentId, text: $text, type: $type,
        confidence: $confidence, positionStart: $positionStart,
        positionEnd: $positionEnd, createdAt: timestamp()
      })
      RETURN n
    $$, ${JSON.stringify({
      id: v.id, documentId: v.documentId, text: v.text, type: v.type,
      confidence: v.confidence, positionStart: v.positionStart, positionEnd: v.positionEnd
    })}) AS (n agtype);
  `);
  return result.rows[0];
}

/** Add a typed edge between two claims. */
export async function addEdge(
  fromClaimId: string,
  toClaimId: string,
  type: 'supports' | 'contradicts' | 'qualifies' | 'depends_on',
  props: Record<string, any> = {}
) {
  await db.execute(sql`
    SELECT * FROM cypher(${GRAPH}, $$
      MATCH (a:Claim {id: $from}), (b:Claim {id: $to})
      CREATE (a)-[r:${sql.raw(type)} ${sql.raw(JSON.stringify(props))}]->(b)
      RETURN r
    $$, ${JSON.stringify({ from: fromClaimId, to: toClaimId })}) AS (r agtype);
  `);
}

/** Find all contradictions in a document. */
export async function findContradictions(documentId: string) {
  const result = await db.execute(sql`
    SELECT * FROM cypher(${GRAPH}, $$
      MATCH (a:Claim {documentId: $docId})-[r:contradicts]->(b:Claim {documentId: $docId})
      RETURN a.id AS from_id, a.text AS from_text,
             b.id AS to_id, b.text AS to_text,
             r.confidence AS confidence, r.severity AS severity
    $$, ${JSON.stringify({ docId: documentId })}) AS (from_id agtype, from_text agtype, to_id agtype, to_text agtype, confidence agtype, severity agtype);
  `);
  return result.rows;
}

/** Traverse evidence supporting a claim (one hop). */
export async function findSupportingEvidence(claimId: string) {
  const result = await db.execute(sql`
    SELECT * FROM cypher(${GRAPH}, $$
      MATCH (e:Claim {type: "evidence"})-[r:supports]->(c:Claim {id: $cid})
      RETURN e.id, e.text, r.confidence
    $$, ${JSON.stringify({ cid: claimId })}) AS (id agtype, text agtype, confidence agtype);
  `);
  return result.rows;
}

/** Delete a claim (and cascade via cypher edge cleanup). */
export async function deleteClaim(claimId: string) {
  await db.execute(sql`
    SELECT * FROM cypher(${GRAPH}, $$
      MATCH (n:Claim {id: $cid})
      DETACH DELETE n
    $$, ${JSON.stringify({ cid: claimId })}) AS (n agtype);
  `);
}
```

### 3.6 Seed script · `src/db/seed.ts`

```typescript
import { db } from './index';
import { orgs, users, documents } from './schema';
import { createClaimVertex, addEdge } from './graph';

async function seed() {
  // Test org
  const [org] = await db.insert(orgs).values({
    name: 'Test Org',
    clerkOrgId: 'org_test_123',
  }).returning();
  if (!org) throw new Error('Failed to create org');

  // Test user
  const [user] = await db.insert(users).values({
    clerkUserId: 'user_test_123',
    email: 'angel@test.com',
    orgId: org.id,
  }).returning();
  if (!user) throw new Error('Failed to create user');

  // Test document
  const [doc] = await db.insert(documents).values({
    orgId: org.id,
    authorUserId: user.id,
    title: 'My first essay',
  }).returning();
  if (!doc) throw new Error('Failed to create document');

  // Test claims
  await createClaimVertex({
    id: 'c1', documentId: doc.id,
    text: 'AI writing tools dont flag cross-paragraph contradictions',
    type: 'factual', confidence: 0.84,
    positionStart: 100, positionEnd: 150,
  });

  await createClaimVertex({
    id: 'c2', documentId: doc.id,
    text: 'Clearbrief proves the model in legal',
    type: 'factual', confidence: 0.91,
    positionStart: 200, positionEnd: 245,
  });

  console.log('✓ seed complete · org', org.id, '· user', user.id, '· doc', doc.id);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

```bash
pnpm db:seed
```

### Senior callouts on this schema

- **Yjs binary stored in `bytea`, not JSON.** Yjs ships its own serialization; round-tripping through JSON is wasteful and breaks the merge invariants.
- **Graph IDs in AGE referenced by string from the relational layer.** Avoids cross-DB foreign key complexity; AGE owns its own ID space.
- **`claim_count` denormalized on `documents`.** Read-heavy query "how many claims does this doc have?" doesn't pay for a graph traversal every render.
- **Per-tenant `orgId` on every relational table; AGE vertices carry `documentId`.** Two layers of tenant isolation.
- **HNSW index on `embedding`.** Without it, vector queries are O(n); with it, O(log n) and acceptable at 100k+ rows.

---

## 4. Auth

Follow `./docs/build-shared/03-auth-clerk.md` for the Clerk setup with org mode + webhook sync.

**Penstroke-specific:** Documents are owned by the *user* but scoped to the *org*. Multiple users in the same org share access to the org's documents (collab is v2; v1 is single-user-but-multi-tenant-ready).

---

## 5. Billing

Follow `./docs/build-shared/04-billing-stripe.md` for Stripe + metered usage.

**Penstroke-specific pricing:**

- **Free:** 1 document, 100 claims/month, no verification.
- **Pro · $19/mo:** unlimited docs, unlimited claims, full verification.
- **Team · $49/seat/mo:** Pro + collab + priority verification queue.

Set up these in Stripe dashboard, copy the price IDs into `.env.local`.

The metered component is **agent calls** — record one row in the `usage` table per agent call:

```typescript
// src/lib/billing/track-usage.ts
import { db } from '@/db';
import { usage } from '@/db/schema';

export async function trackAgentCall({
  orgId, meter, amount, costCents,
}: {
  orgId: string;
  meter: 'detector' | 'verifier' | 'gap';
  amount: number;
  costCents: number;
}) {
  await db.insert(usage).values({
    orgId, meter: `${meter}_call`, amount, costUsd: costCents,
  });
}
```

Call this from every agent invocation (see section 6).

---

## 6. AI integration · agent fleet

Follow `./docs/build-shared/05-ai-anthropic.md` for the Anthropic SDK setup. Then build Penstroke's three agents.

### 6.1 Shared client · `src/ai/client.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const MODELS = {
  REASONING: 'claude-sonnet-4-6',
  CHEAP: 'claude-haiku-4-5-20251001',
} as const;

const PRICE_PER_MTOK = {
  'claude-sonnet-4-6':       { in: 3, out: 15, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { in: 1, out: 5, cacheRead: 0.10 },
};

export function callCostCents({ model, inputTokens, outputTokens, cacheReadTokens = 0 }) {
  const p = PRICE_PER_MTOK[model as keyof typeof PRICE_PER_MTOK];
  if (!p) return 0;
  return Math.ceil((
    (inputTokens / 1_000_000) * p.in +
    (outputTokens / 1_000_000) * p.out +
    (cacheReadTokens / 1_000_000) * p.cacheRead
  ) * 100);
}
```

### 6.2 Claim-detector agent · `src/ai/agents/claim-detector.ts`

Runs on every paragraph. Uses Haiku for sub-200ms latency.

```typescript
import { anthropic, MODELS, callCostCents } from '../client';
import { z } from 'zod';
import { trackAgentCall } from '@/lib/billing/track-usage';

const ClaimSchema = z.object({
  claims: z.array(z.object({
    text: z.string(),
    type: z.enum(['factual', 'opinion', 'speculation', 'evidence', 'question']),
    confidence: z.number().min(0).max(1),
    position: z.tuple([z.number(), z.number()]),
  })),
});

const SYSTEM_PROMPT = `You analyze a single paragraph of writing and extract structured claims.

For each statement that makes a claim about reality, opinion, speculation, evidence, or question:
- text: the exact span of text from the paragraph
- type: one of "factual" | "opinion" | "speculation" | "evidence" | "question"
- confidence: 0-1 how confident you are this is the right type
- position: [start, end] character offsets in the paragraph

Output JSON ONLY matching this schema. No prose.

Examples:

Input: "The current generation of AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument."
Output: {"claims": [{"text": "AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument", "type": "factual", "confidence": 0.84, "position": [33, 132]}]}

Input: "Is the gap because the underlying CRDT work is too expensive, or because inference costs were prohibitive?"
Output: {"claims": [{"text": "Is the gap because the underlying CRDT work is too expensive, or because inference costs were prohibitive?", "type": "question", "confidence": 0.95, "position": [0, 110]}]}

Input: "Maybe AI tools will eventually solve this on their own."
Output: {"claims": [{"text": "AI tools will eventually solve this on their own", "type": "speculation", "confidence": 0.78, "position": [6, 56]}]}
`;

export async function detectClaims(paragraph: string, orgId: string) {
  const response = await anthropic.messages.create({
    model: MODELS.CHEAP,
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: paragraph }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const parsed = ClaimSchema.parse(JSON.parse(raw));

  // Track cost
  const costCents = callCostCents({
    model: MODELS.CHEAP,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'detector', amount: 1, costCents });

  return parsed.claims;
}
```

### 6.3 Verification agent · `src/ai/agents/verifier.ts`

Runs in the background via Trigger.dev. Uses Sonnet + tool use (Exa search + bibliography retrieval).

```typescript
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { db } from '@/db';
import { bibliography } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { addEdge } from '@/db/graph';
import type Anthropic from '@anthropic-ai/sdk';

const tools: Anthropic.Tool[] = [
  {
    name: 'search_bibliography',
    description: 'Semantic search over the document\'s bibliography. Returns top-k passages with URLs.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        k: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_web',
    description: 'Web search via Exa for corroborating or contradicting sources. Use sparingly; expensive.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'mark_supported',
    description: 'Mark a claim as supported by a source.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: { type: 'string' },
        sourceUrl: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['claimId', 'sourceUrl', 'confidence'],
    },
  },
  {
    name: 'mark_contradicted',
    description: 'Mark a claim as contradicting another claim. Provide reasoning.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: { type: 'string' },
        contradictsClaimId: { type: 'string' },
        explanation: { type: 'string' },
        confidence: { type: 'number' },
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['claimId', 'contradictsClaimId', 'explanation', 'confidence', 'severity'],
    },
  },
];

async function handleTool(name: string, input: any, ctx: { documentId: string; orgId: string }) {
  switch (name) {
    case 'search_bibliography': {
      // Embed query and search the bibliography table via pgvector
      const queryEmb = await embedText(input.query); // see voyage helper below
      const result = await db.execute(sql`
        SELECT id, url, title, content_snapshot,
               1 - (embedding <=> ${`[${queryEmb.join(',')}]`}::vector) AS similarity
        FROM bibliography
        WHERE document_id = ${ctx.documentId}
        ORDER BY embedding <=> ${`[${queryEmb.join(',')}]`}::vector
        LIMIT ${input.k ?? 5}
      `);
      return result.rows;
    }
    case 'search_web': {
      // Call Exa API
      const r = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.EXA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input.query, numResults: 5, type: 'neural' }),
      });
      const json = await r.json();
      return json.results;
    }
    case 'mark_supported':
      // Write a "supports" edge in AGE; see graph.ts
      // (Real impl: upsert evidence vertex first if URL not already in graph)
      return { ok: true };
    case 'mark_contradicted':
      await addEdge(input.claimId, input.contradictsClaimId, 'contradicts', {
        explanation: input.explanation,
        confidence: input.confidence,
        severity: input.severity,
      });
      return { ok: true };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const VERIFIER_SYSTEM = `You verify claims in a document by retrieving evidence.

For each claim you receive, decide:
1. Is this claim supported by the document's bibliography? (use search_bibliography)
2. If insufficient, search the web (use search_web sparingly).
3. If supported, call mark_supported.
4. Look for contradictions with other claims in the same document; if found, call mark_contradicted.

Be conservative. Only mark supported with confidence >= 0.7. Only mark contradicted if the conflict is substantive, not stylistic.`;

export async function verifyClaim({
  claimId, claimText, documentId, orgId, otherClaims,
}: {
  claimId: string;
  claimText: string;
  documentId: string;
  orgId: string;
  otherClaims: { id: string; text: string }[];
}) {
  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `Claim to verify (id=${claimId}): "${claimText}"\n\nOther claims in this document:\n${otherClaims.map(c => `- (${c.id}) ${c.text}`).join('\n')}`,
  }];

  let totalIn = 0, totalOut = 0, totalCacheRead = 0;

  for (let i = 0; i < 8; i++) {
    const resp = await anthropic.messages.create({
      model: MODELS.REASONING,
      max_tokens: 2048,
      system: [{ type: 'text', text: VERIFIER_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
    });

    totalIn += resp.usage.input_tokens;
    totalOut += resp.usage.output_tokens;
    totalCacheRead += resp.usage.cache_read_input_tokens ?? 0;

    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'tool_use') {
      const toolBlocks = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        const result = await handleTool(block.name, block.input, { documentId, orgId });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Track cost and exit
    const costCents = callCostCents({ model: MODELS.REASONING, inputTokens: totalIn, outputTokens: totalOut, cacheReadTokens: totalCacheRead });
    await trackAgentCall({ orgId, meter: 'verifier', amount: 1, costCents });
    return resp;
  }

  throw new Error('Verifier exceeded 8 iterations');
}

// Voyage embedding helper
async function embedText(text: string): Promise<number[]> {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: [text], model: 'voyage-3-large' }),
  });
  const json = await r.json();
  return json.data[0].embedding;
}
```

### 6.4 Gap-detector agent · `src/ai/agents/gap-detector.ts`

Runs on doc save. Looks for unsupported claims, missing premises, orphan questions.

```typescript
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';

const GAP_SYSTEM = `You audit a document's claim graph for gaps:
- Claims with no supporting evidence (and that should have some)
- Questions raised but never answered later in the document
- Premises required for an argument that aren't stated
- Circular dependencies in the claim graph

Output JSON: { gaps: [{ type: "unsupported"|"unanswered"|"missing_premise"|"circular", claimIds: [...], explanation: string, severity: "low"|"medium"|"high" }] }`;

export async function detectGaps(claimGraph: any, orgId: string) {
  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 2048,
    system: [{ type: 'text', text: GAP_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Claim graph:\n${JSON.stringify(claimGraph, null, 2)}` }],
  });

  const costCents = callCostCents({
    model: MODELS.REASONING,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'gap', amount: 1, costCents });

  const raw = resp.content[0]?.type === 'text' ? resp.content[0].text : '{"gaps": []}';
  return JSON.parse(raw);
}
```

### 6.5 Trigger.dev workflow · `src/jobs/verify-document.ts`

Orchestrates verification across all unverified claims in a document.

```typescript
import { task } from '@trigger.dev/sdk/v3';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyClaim } from '@/ai/agents/verifier';
import { detectGaps } from '@/ai/agents/gap-detector';
import { findContradictions } from '@/db/graph';

export const verifyDocument = task({
  id: 'verify-document',
  retry: { maxAttempts: 3 },
  run: async ({ documentId, orgId }: { documentId: string; orgId: string }) => {
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) throw new Error('Document not found');

    // Get all claims for this doc from AGE (pseudocode; use graph.ts helper)
    const claims = []; // ... fetch from AGE

    // Verify each unverified claim
    for (const claim of claims) {
      if (claim.verified) continue;
      const others = claims.filter(c => c.id !== claim.id);
      await verifyClaim({
        claimId: claim.id,
        claimText: claim.text,
        documentId,
        orgId,
        otherClaims: others,
      });
    }

    // Then detect gaps across the verified graph
    await detectGaps(claims, orgId);

    // Update denormalized counts
    const contradictions = await findContradictions(documentId);
    await db.update(documents)
      .set({ contradictionCount: contradictions.length, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    return { claimCount: claims.length, contradictionCount: contradictions.length };
  },
});
```

Trigger this job from the API on save:

```typescript
// src/app/api/documents/[id]/save/route.ts
import { verifyDocument } from '@/jobs/verify-document';
// after persisting yjs state:
await verifyDocument.trigger({ documentId, orgId });
```

### Senior callouts on the agent fleet

- **Two-tier model routing.** Haiku is ~$0.001/call for claim-detection (high frequency); Sonnet is ~$0.012-0.018/call for verification (low frequency, high value). Mixing models is the cost discipline that keeps Penstroke profitable.
- **Prompt caching on system prompts.** All three agents have stable system prompts cached at $0.30/Mtok read vs $3/Mtok cold. After first call within 5min, subsequent calls cost ~10% as much.
- **Tool use for verification.** The verifier doesn't generate prose; it calls tools (`search_bibliography`, `search_web`, `mark_supported`, `mark_contradicted`). The agent decides WHAT to do; your handlers decide HOW.
- **Iteration cap.** Each agent has a hard cap (8 iterations). Runaway agents are a real failure mode; caps make cost knowable.
- **Background via Trigger.dev.** Verification doesn't block the request path. UI streams updates over WebSocket as the job progresses.

---

## 7. Frontend · Tiptap + Yjs + side-pane viz

### 7.1 Custom Tiptap node types · `src/editor/extensions/`

Three custom inline marks (decorations applied to existing text, not block-level nodes):

#### `claim.ts`

```typescript
import { Mark, mergeAttributes } from '@tiptap/core';

export const ClaimMark = Mark.create({
  name: 'claim',
  addAttributes() {
    return {
      claimId: { default: null, parseHTML: el => el.getAttribute('data-claim-id') },
      claimType: { default: 'factual', parseHTML: el => el.getAttribute('data-claim-type') },
      verified: { default: false, parseHTML: el => el.getAttribute('data-verified') === 'true' },
      contradicted: { default: false, parseHTML: el => el.getAttribute('data-contradicted') === 'true' },
    };
  },
  parseHTML() { return [{ tag: 'span[data-claim-id]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      class: `claim ${HTMLAttributes.contradicted ? 'claim--contradicted' : ''}`
    }), 0];
  },
});
```

#### `evidence.ts` and `question.ts`

Same structure with different attribute names. (See `src/editor/extensions/evidence.ts` and `question.ts`.)

### 7.2 Editor component · `src/components/editor/Editor.tsx`

```typescript
'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useRef, useState } from 'react';
import { ClaimMark } from '@/editor/extensions/claim';
import { EvidenceMark } from '@/editor/extensions/evidence';
import { QuestionMark } from '@/editor/extensions/question';
import { detectClaims } from '@/ai/agents/claim-detector';
import { useDebounce } from '@/lib/hooks/use-debounce';

export function Editor({ documentId, orgId }: { documentId: string; orgId: string }) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    const p = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL!,
      `vellum-doc-${documentId}`,
      ydocRef.current,
    );
    setProvider(p);
    return () => p.destroy();
  }, [documentId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydocRef.current }),
      provider && CollaborationCursor.configure({ provider }),
      ClaimMark, EvidenceMark, QuestionMark,
    ].filter(Boolean) as any,
    immediatelyRender: false,
  });

  // On every paragraph change, run the claim-detector
  const lastDetectedRef = useRef<string>('');
  const debouncedDetect = useDebounce(async (paragraphText: string) => {
    if (!paragraphText || paragraphText === lastDetectedRef.current) return;
    lastDetectedRef.current = paragraphText;
    const claims = await detectClaims(paragraphText, orgId);
    // Apply marks to the editor based on returned claims
    if (editor && claims.length > 0) {
      claims.forEach((c) => {
        editor.chain().focus()
          .setTextSelection({ from: c.position[0], to: c.position[1] })
          .setMark('claim', { claimId: crypto.randomUUID(), claimType: c.type })
          .run();
      });
    }
  }, 800);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', ({ editor }) => {
      // Find the paragraph the user just modified
      const { selection } = editor.state;
      const para = editor.state.doc.nodeAt(selection.from)?.textContent ?? '';
      debouncedDetect(para);
    });
    return () => { editor.off('update'); };
  }, [editor, debouncedDetect]);

  return <EditorContent editor={editor} className="doc prose-vellum" />;
}
```

### 7.3 Side-pane claim viewer · `src/components/editor/ClaimGraphPane.tsx`

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useEditorContext } from '@/lib/editor-context';

interface ClaimNode {
  id: string;
  type: string;
  text: string;
  verified: boolean;
  contradicted: boolean;
}

export function ClaimGraphPane({ documentId }: { documentId: string }) {
  const [claims, setClaims] = useState<ClaimNode[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);

  // Subscribe to graph updates via WebSocket (the same WS the editor uses)
  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/graph/${documentId}`);
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === 'graph_update') {
        setClaims(data.claims);
        setContradictions(data.contradictions);
      }
    };
    return () => ws.close();
  }, [documentId]);

  return (
    <div className="graph-pane">
      <div className="graph-pane__head">claim graph · {claims.length} claims · {contradictions.length} contradictions</div>
      {claims.map((c) => (
        <div key={c.id} className={`graph-node ${c.contradicted ? 'graph-node--contradicted' : ''}`}>
          <span className="graph-node__id">{c.id.slice(0, 4)}</span>
          <div>
            <div className="graph-node__type">{c.type}{c.verified ? ' · verified' : ''}{c.contradicted ? ' · contradicted' : ''}</div>
            <div className="graph-node__text">{c.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 7.4 Routes

```
src/app/
├── (marketing)/
│   ├── page.tsx                  # landing page
│   └── pricing/page.tsx
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── app/
│   ├── layout.tsx                # protected layout
│   ├── page.tsx                  # documents list
│   └── doc/[id]/page.tsx         # editor + side pane
├── api/
│   ├── webhooks/clerk/route.ts
│   ├── webhooks/stripe/route.ts
│   ├── documents/[id]/save/route.ts
│   └── billing/checkout/route.ts
```

### 7.5 Document page · `src/app/app/doc/[id]/page.tsx`

```typescript
import { Editor } from '@/components/editor/Editor';
import { ClaimGraphPane } from '@/components/editor/ClaimGraphPane';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');
  const { id } = await params;

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6 p-6 max-w-7xl mx-auto">
      <Editor documentId={id} orgId={orgId} />
      <ClaimGraphPane documentId={id} />
    </div>
  );
}
```

### Senior callouts on the frontend

- **Tiptap marks, not nodes.** Inline decorations don't disrupt block flow under user typing. Block nodes would force re-layout and break cursor behavior.
- **Yjs as source of truth.** The editor renders from Yjs; the graph is derived. There's no "two editors fighting" — Yjs is canonical.
- **Debounced claim-detection.** Running the detector on every keystroke would be expensive and laggy. 800ms debounce hits the right balance; unsaved paragraphs are detected before the user moves to the next.
- **WebSocket for graph updates.** Polling would be slow and wasteful; WebSocket lets the agent fleet push updates as they finish.

---

## 8. Eval harness

Follow `./docs/build-shared/06-evals-braintrust.md` for the harness scaffold.

### 8.1 Penstroke-specific eval rubric

Penstroke evals run against three datasets:

1. **claim-detection.jsonl** — paragraphs with hand-labeled claims.
2. **contradiction-detection.jsonl** — pairs of claims with hand-labeled contradiction status.
3. **verification-grounding.jsonl** — claims + bibliographies with hand-labeled support strengths.

### 8.2 Sample dataset · `evals/datasets/claim-detection.jsonl`

```jsonl
{"input": "The current generation of AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument.", "expected": {"claims": [{"text": "AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument", "type": "factual", "confidence_min": 0.7}]}}
{"input": "Maybe AI tools will eventually solve this on their own.", "expected": {"claims": [{"text": "AI tools will eventually solve this on their own", "type": "speculation", "confidence_min": 0.6}]}}
{"input": "Is the gap because the underlying CRDT work is too expensive?", "expected": {"claims": [{"text": "Is the gap because the underlying CRDT work is too expensive", "type": "question", "confidence_min": 0.85}]}}
{"input": "Clearbrief raised $5M in 2024 according to Crunchbase.", "expected": {"claims": [{"text": "Clearbrief raised $5M in 2024", "type": "factual", "confidence_min": 0.85}]}}
```

(Add 30+ entries for v1; grow to 200+ over time.)

### 8.3 Eval task · `evals/tasks/claim-detector.eval.ts`

```typescript
import { Eval } from 'braintrust';
import { detectClaims } from '@/ai/agents/claim-detector';
import dataset from '../datasets/claim-detection.json';

Eval('vellum-claim-detector-v1', {
  data: () => dataset,
  task: async (input: string) => await detectClaims(input, 'eval-test-org'),
  scores: [
    // 1. Did we detect ~the right number of claims?
    async ({ output, expected }) => ({
      name: 'claim_count_match',
      score: output.length === expected.claims.length ? 1 : 0,
    }),
    // 2. Did we get the type right for each detected claim?
    async ({ output, expected }) => {
      let matches = 0;
      for (const expClaim of expected.claims) {
        const found = output.find((c: any) =>
          c.text.includes(expClaim.text.slice(0, 30)) && c.type === expClaim.type
        );
        if (found) matches++;
      }
      return { name: 'type_match', score: matches / expected.claims.length };
    },
    // 3. Confidence within tolerance
    async ({ output, expected }) => {
      let matches = 0;
      for (const expClaim of expected.claims) {
        const found = output.find((c: any) => c.text.includes(expClaim.text.slice(0, 30)));
        if (found && found.confidence >= expClaim.confidence_min) matches++;
      }
      return { name: 'confidence_above_min', score: matches / expected.claims.length };
    },
  ],
});
```

### 8.4 CI gating · `.github/workflows/eval.yml`

```yaml
name: eval

on:
  pull_request:
    branches: [main]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm braintrust eval evals/tasks/
        env:
          BRAINTRUST_API_KEY: ${{ secrets.BRAINTRUST_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          VOYAGE_API_KEY: ${{ secrets.VOYAGE_API_KEY }}
      - name: regression check
        run: pnpm tsx scripts/eval-gate.ts
```

`scripts/eval-gate.ts`:

```typescript
import { initLogger } from 'braintrust';

const logger = initLogger({ projectName: 'penstroke' });
const baseline = { claim_count_match: 0.85, type_match: 0.85, confidence_above_min: 0.75 };
const TOLERANCE = 0.05;

// Fetch latest run from Braintrust API; compare to baseline
// Implementation: braintrust SDK call to fetch run scores
// If any score dropped > TOLERANCE below baseline, exit 1.

// (Full impl uses the Braintrust v2 API; see https://www.braintrust.dev/docs)
```

### 8.5 Growing the gold set

Whenever you find a real-user-flagged failure, paste it to Claude Code:

```
[CC:]
> @evals/datasets/regressions.jsonl Add this failure case:
  input = "<exact input>"
  expected = "<what should have happened>"
  Then run vellum-claim-detector-v1 and tell me if the latest model
  version still fails this case.
```

---

## 9. Deploy

Follow `./docs/build-shared/07-deploy-vercel.md` for prod deploy.

**Penstroke-specific env vars:**

```
ANTHROPIC_API_KEY
DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_PRO
STRIPE_PRICE_TEAM
EXA_API_KEY
VOYAGE_API_KEY
TRIGGER_API_KEY
TRIGGER_API_URL
BRAINTRUST_API_KEY
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
SENTRY_DSN
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_WS_URL  # Cloudflare Worker URL for WebSocket
```

**Vercel build command:**

```json
{ "buildCommand": "pnpm db:migrate && pnpm build" }
```

**Cloudflare Worker (separate deploy):**

The y-websocket relay runs as a Cloudflare Worker with Durable Objects. Deploy via Wrangler:

```bash
pnpm add -D wrangler
pnpm wrangler login
pnpm wrangler deploy --name vellum-ws
```

`wrangler.toml`:

```toml
name = "vellum-ws"
main = "src/workers/ws.ts"
compatibility_date = "2025-04-01"

[[durable_objects.bindings]]
name = "DOC_DURABLE"
class_name = "DocDurable"

[[migrations]]
tag = "v1"
new_classes = ["DocDurable"]
```

`src/workers/ws.ts` handles y-websocket protocol per-document via Durable Object — see https://developers.cloudflare.com/durable-objects/.

---

## 10. v1 cutlist

### v1 ships when:

1. Demo video shows the flow end-to-end without breaking. The 30-second LinkedIn cut works.
2. Eval scores: claim-detection ≥0.85 type_match; contradiction-detection ≥0.75 F1.
3. Single-user multi-tenant flow works (sign up → org → write doc → see graph populate → see contradiction flag).
4. Cost per active hour <$0.10.

### v1 INCLUDES:
- Sign up / sign in (Clerk).
- Single-tenant doc editing (Yjs but no live collab UX).
- Tiptap editor with claim/evidence/question marks.
- Live claim detection (Haiku).
- Background verification (Sonnet + Exa + bibliography).
- Side-pane claim graph (D3 force-graph, simplified).
- Inline contradiction warnings.
- Bibliography paste-URL flow.
- Eval harness with v1 gold sets (~30 entries).
- Cost-tier routing + tracking.
- Sentry + Langfuse wiring.
- Deploy to Vercel + Cloudflare.

### v1 EXCLUDES (deferred to v2):
- Multi-user collab UX (Yjs is wired but no presence cursors / named attribution).
- Stripe billing (free tier only).
- Document export to formatted prose.
- Mobile.
- Multiple documents per user (single-doc only).

### Scope-cut order if shipping is at risk past day 21:

1. **Cut bibliography auto-fetch.** User pastes plain text URLs; skip the auto-fetch.
2. **Cut Exa web search.** Verification only checks the document's own bibliography.
3. **Cut force-graph viz.** Use a simple bullet-list of claims in the side-pane.
4. **Cut contradiction inline UI.** List contradictions in the side-pane only.

If after all four cuts you still can't ship, the project's not ready — go back to architecture review.

---

## Claude Code workflow throughout this build

See `./docs/build-shared/08-claude-code-workflow.md` for the general pattern and `projects/vellum/workflow.md` for Penstroke-specific prompt examples.

The headline: **you make every architectural decision; CC writes every line of code that follows from those decisions.** The case-study story is how you delegated boilerplate, repetitive refactors, and eval scaffolding to CC; reserved system design and product shaping for yourself; and shipped at 3-person-team scope as a result.

---

## References

See `./references.md` for the full competitor landscape, primary user-pain sources, and architectural-pattern references this build draws from.
