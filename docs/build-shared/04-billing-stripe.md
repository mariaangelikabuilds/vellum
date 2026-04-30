# 04 · Billing — Stripe (subscription + usage-metered)

## Step 1 — Install

```bash
pnpm add stripe @stripe/stripe-js
```

## Step 2 — Stripe dashboard setup

1. Create account at https://stripe.com (use TEST mode for dev).
2. Products → create your project's product (e.g. "Penstroke Pro").
3. Price → recurring monthly subscription at $X/seat.
4. (If usage-metered) add a metered price: per-call billing at $Y per use.
5. Copy keys: **Publishable** (pk_test_...) and **Secret** (sk_test_...).
6. Webhooks → add endpoint (post-deploy): `https://yourdomain.com/api/webhooks/stripe` with events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

## Step 3 — Envs

`.env.local`:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Price IDs (from Stripe dashboard)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_USAGE=price_...   # if metered
```

## Step 4 — Stripe client

`src/lib/billing/stripe.ts`:

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',  // pin the version
  typescript: true,
});
```

## Step 5 — Schema additions

In `src/db/schema.ts`:

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  status: text('status').notNull(),  // 'active', 'past_due', 'canceled', etc.
  priceId: text('price_id').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usage = pgTable('usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  meter: text('meter').notNull(),  // e.g. 'agent_runs', 'tokens_in', 'tokens_out'
  amount: integer('amount').notNull(),
  reportedToStripe: boolean('reported_to_stripe').default(false),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgMeterIdx: index('usage_org_meter_idx').on(t.orgId, t.meter, t.occurredAt),
}));
```

## Step 6 — Checkout endpoint

`src/app/api/billing/checkout/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/billing/stripe';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return new NextResponse('Unauthorized', { status: 401 });

  const { priceId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { clerkOrgId: orgId },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?canceled=1`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
```

## Step 7 — Webhook

`src/app/api/webhooks/stripe/route.ts`:

```typescript
import { stripe } from '@/lib/billing/stripe';
import { db } from '@/db';
import { subscriptions, orgs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const sess = event.data.object;
      const sub = await stripe.subscriptions.retrieve(sess.subscription as string);
      const [org] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, sess.metadata!.clerkOrgId));
      if (!org) break;
      await db.insert(subscriptions).values({
        orgId: org.id,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]!.price.id,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      }).onConflictDoNothing();
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await db.update(subscriptions)
        .set({ status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

## Step 8 — Usage reporting (metered)

`src/lib/billing/report-usage.ts`:

```typescript
import { stripe } from './stripe';
import { db } from '@/db';
import { usage, subscriptions } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function reportUsageToStripe(orgId: string, meter: string, amount: number) {
  // record locally first (source of truth)
  await db.insert(usage).values({ orgId, meter, amount });

  // batch-report to Stripe (cron job hits this every 15min in prod)
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId));
  if (!sub) return;

  const subItems = await stripe.subscriptionItems.list({ subscription: sub.stripeSubscriptionId });
  const meterItem = subItems.data.find((i) => i.price.id === process.env.STRIPE_PRICE_USAGE);
  if (!meterItem) return;

  await stripe.subscriptionItems.createUsageRecord(meterItem.id, {
    quantity: amount,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',
  });
}
```

## Step 9 — Portal (let users manage their sub)

`src/app/api/billing/portal/route.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/billing/stripe';
import { db } from '@/db';
import { subscriptions, orgs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST() {
  const { orgId } = await auth();
  if (!orgId) return new NextResponse('Unauthorized', { status: 401 });

  const [org] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, orgId));
  if (!org) return new NextResponse('Not found', { status: 404 });

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, org.id));
  if (!sub) return new NextResponse('No subscription', { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing`,
  });

  return NextResponse.json({ url: session.url });
}
```

## Senior callouts

- **Why pin the Stripe API version?** Surprise updates at 3am are unfun. Pinning lets you upgrade deliberately and read changelogs.
- **Why local usage table + batch report?** Network failures shouldn't lose billable events. Local DB is source of truth; Stripe sync is best-effort.
- **Why metadata on Checkout?** Clerk's orgId travels with the session so the webhook can attribute correctly.
- **Why `onConflictDoNothing` on the subscription insert?** Webhooks fire at-least-once; idempotency at the DB layer is non-negotiable.
