import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  customType,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1024)';
  },
  toDriver(value) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value) {
    return JSON.parse(value as string);
  },
});

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    email: text('email').notNull(),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('users_org_idx').on(t.orgId)],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => orgs.id, { onDelete: 'cascade' })
      .notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull().default('Untitled'),
    /** which lens the document is read through. researcher = claim/evidence/contradiction
        detection; freeform = intent-coherence detection (miss/bury/drift/land marks). */
    mode: text('mode').notNull().default('researcher'),
    /** for freeform documents only: the one-sentence statement of what the writing is
        meant to do. AI reads the draft against this. */
    intent: text('intent'),
    /** plaintext snapshot of the prose; persisted on debounced save so the public viewer
        and search can read without hydrating Yjs */
    proseText: text('prose_text').default(''),
    /** user-defined tags for the document */
    tags: text('tags').array().default([]),
    /** is this document publishable / visible at /v/[id] without auth? */
    published: boolean('published').default(false),
    yjsState: bytea('yjs_state'),
    claimCount: integer('claim_count').default(0),
    contradictionCount: integer('contradiction_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('documents_org_idx').on(t.orgId),
    index('documents_author_idx').on(t.authorUserId),
  ],
);

export const revisions = pgTable(
  'revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    yjsUpdate: bytea('yjs_update').notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('revisions_doc_idx').on(t.documentId, t.createdAt)],
);

export const bibliography = pgTable(
  'bibliography',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    url: text('url'),
    title: text('title'),
    contentSnapshot: text('content_snapshot'),
    embedding: vector('embedding'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('bib_doc_idx').on(t.documentId)],
);

export const usage = pgTable(
  'usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => orgs.id, { onDelete: 'cascade' })
      .notNull(),
    meter: text('meter').notNull(),
    amount: integer('amount').notNull(),
    costUsdCents: integer('cost_usd_cents').default(0),
    reportedToStripe: boolean('reported_to_stripe').default(false),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('usage_org_meter_idx').on(t.orgId, t.meter, t.occurredAt)],
);

// Newsletter subscribers — readers subscribe to a writer's published essays
export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorUserId: uuid('author_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('subscribers_author_idx').on(t.authorUserId),
    index('subscribers_email_idx').on(t.email),
  ],
);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .references(() => orgs.id, { onDelete: 'cascade' })
    .notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text('status').notNull(),
  priceId: text('price_id').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
