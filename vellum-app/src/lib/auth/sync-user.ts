import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orgs, users } from '@/db/schema';

/**
 * Idempotently syncs the current Clerk user (and active org if any) into Postgres.
 * Returns the local DB user record. Call from server components / route handlers
 * that need to ensure DB rows exist before reading or writing.
 */
export async function syncCurrentUser() {
  const { userId, orgId } = await auth();
  if (!userId) {
    throw new Error('Not signed in');
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? '';

  const [user] = await db
    .insert(users)
    .values({ clerkUserId: userId, email, orgId: null })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email },
    })
    .returning();

  if (!user) {
    throw new Error('User upsert returned no row');
  }

  if (orgId) {
    const orgName = clerkUser?.publicMetadata?.orgName as string | undefined;
    const [org] = await db
      .insert(orgs)
      .values({ clerkOrgId: orgId, name: orgName ?? 'Untitled org' })
      .onConflictDoUpdate({
        target: orgs.clerkOrgId,
        set: orgName ? { name: orgName } : {},
      })
      .returning();

    if (org && user.orgId !== org.id) {
      await db.update(users).set({ orgId: org.id }).where(eq(users.id, user.id));
      return { ...user, orgId: org.id };
    }
  }

  return user;
}
