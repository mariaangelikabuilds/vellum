# 02 · Database — Neon + Drizzle

## Step 1 — Provision Neon

1. Go to https://console.neon.tech, create a new project.
2. Pick region near your Vercel deployment.
3. Copy the connection string (`postgresql://user:pass@host/db?sslmode=require`).
4. Paste into `.env.local`:

```dotenv
DATABASE_URL=postgresql://...
```

5. (Recommended) Create a separate "shadow" branch in Neon for migrations:

```dotenv
DATABASE_URL_UNPOOLED=postgresql://...  # pooler-bypassed for migrations
```

## Step 2 — Install Drizzle

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit dotenv tsx
```

## Step 3 — Drizzle config

`drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

## Step 4 — DB client

`src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });
export type Db = typeof db;
```

## Step 5 — Schema starter (project-specific schemas extend this)

`src/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// === Multi-tenancy primitives (every project needs these) ===

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

// === PROJECT-SPECIFIC TABLES go below this line ===
// (the build guide's section 3 has the actual schema for the project)
```

## Step 6 — Migrations + seed

Add scripts to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

```bash
pnpm db:generate  # creates SQL migrations from schema diff
pnpm db:push      # applies to Neon (use db:migrate in prod)
pnpm db:studio    # browse the data at studio.drizzle.studio
```

## Step 7 — pgvector (if the project uses embeddings)

In Neon SQL editor or via migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Add to `schema.ts`:

```typescript
import { customType } from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'vector(1024)'; },  // adjust to your embedding model's dim
  toDriver(value) { return `[${value.join(',')}]`; },
  fromDriver(value) { return JSON.parse(value as string); },
});

// Use in tables:
// embedding: vector('embedding')
```

For ANN search performance, add an HNSW index per vector column:

```sql
CREATE INDEX idx_my_table_embedding ON my_table
  USING hnsw (embedding vector_cosine_ops);
```

## Step 8 — Row-level security (multi-tenant projects)

For multi-tenant security, set up RLS:

```sql
-- on each tenant-scoped table:
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON my_table
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

Set the session variable per request via Drizzle:

```typescript
await db.execute(sql`SET LOCAL app.current_org_id = ${orgId}`);
```

## Step 9 — Verify

```bash
pnpm db:generate
pnpm db:push
pnpm db:studio  # open studio.drizzle.studio in browser
```

Insert one row manually to confirm the schema works.

## Senior callouts (defend in case-study)

- **Why Drizzle?** Type-safe ORM with zero runtime cost; queries compile to SQL you can read. Better than Prisma at the senior bar (no separate query engine, no global state).
- **Why Neon?** Serverless Postgres with branching (instant prod-clone for testing). Pricing scales with actual usage; no idle cost in dev.
- **Why pgvector vs. Pinecone/Weaviate?** Single source of truth — relational + vector in one DB, transactional consistency, no sync issues. Good to ~10M vectors.
- **Why RLS over app-level filtering?** Defense in depth — even a bug in app code can't leak across tenants. Senior signal that you think about multi-tenant security at the right layer.
