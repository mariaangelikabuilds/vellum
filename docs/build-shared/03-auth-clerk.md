# 03 · Auth — Clerk (with org mode for multi-tenant)

## Step 1 — Install + envs

```bash
pnpm add @clerk/nextjs
```

In Clerk dashboard:
- Create a new application.
- Enable **Organizations** under "Multi-organization."
- Copy publishable + secret keys.

`.env.local`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

## Step 2 — Provider

`src/app/layout.tsx` — wrap children:

```typescript
import { ClerkProvider } from '@clerk/nextjs';
// ...
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## Step 3 — Middleware

`src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher(['/app(.*)', '/api/(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth.protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

## Step 4 — Sign-in / sign-up routes

`src/app/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignIn appearance={{ elements: { card: 'border border-rule-strong rounded-none' } }} />
    </main>
  );
}
```

`src/app/sign-up/[[...sign-up]]/page.tsx` — same structure with `SignUp`.

## Step 5 — Org sync to Postgres

When a user signs up or joins an org, sync to your DB. `src/lib/auth/sync-user.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, orgs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function syncCurrentUser() {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error('Not signed in');

  // upsert user
  const [user] = await db
    .insert(users)
    .values({ clerkUserId: userId, email: '' /* fetched from Clerk */, orgId: null })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { /* updated fields */ },
    })
    .returning();

  // upsert org if active
  if (orgId) {
    const [org] = await db
      .insert(orgs)
      .values({ clerkOrgId: orgId, name: 'TBD' })
      .onConflictDoUpdate({ target: orgs.clerkOrgId, set: {} })
      .returning();

    if (org && user) {
      await db.update(users).set({ orgId: org.id }).where(eq(users.id, user.id));
    }
  }

  return user;
}
```

## Step 6 — Webhook for sync (production)

Set up a webhook endpoint at `/api/webhooks/clerk/route.ts` that handles `user.created`, `organization.created`, etc. Use Clerk's webhook signature verification.

```typescript
import { Webhook } from 'svix';
import { headers } from 'next/headers';
// ... handle events: user.created, organization.created, organization.member.added
```

In Clerk dashboard, add the endpoint URL after deploy: `https://yourdomain.com/api/webhooks/clerk`.

## Step 7 — Protected component

```typescript
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AppPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <div>Hello {userId}</div>;
}
```

## Step 8 — Org switcher (multi-tenant projects)

```typescript
import { OrganizationSwitcher } from '@clerk/nextjs';

<OrganizationSwitcher
  hidePersonal
  afterSelectOrganizationUrl="/app"
  appearance={{ elements: { rootBox: 'border border-rule-strong rounded-none' } }}
/>
```

## Senior callouts

- **Why Clerk over NextAuth/Auth.js?** Org mode out of the box is rare; multi-tenant auth is a notorious time-sink and Clerk's org primitives are correctly modeled.
- **Why webhook sync?** You need your DB to be the source of truth for queries (Clerk is the source of truth for auth); webhooks keep them consistent.
- **Why row-level security at DB level + auth at middleware?** Defense in depth — described in detail in 02-database-postgres.md.
