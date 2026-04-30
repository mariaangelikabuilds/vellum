import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { eq, and, count } from 'drizzle-orm';
import { db } from '@/db';
import { documents, subscribers } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { ProfileCard } from '@/components/profile/ProfileCard';

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await syncCurrentUser();

  const [publishedRow] = user.orgId
    ? await db
        .select({ count: count() })
        .from(documents)
        .where(and(eq(documents.orgId, user.orgId), eq(documents.published, true)))
    : [{ count: 0 }];

  const [subscriberRow] = await db
    .select({ count: count() })
    .from(subscribers)
    .where(eq(subscribers.authorUserId, user.id));

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-rule px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/app" className="font-mono text-lg text-ink hover:text-ink-2">
            penstroke
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3">
            profile
          </span>
        </div>
        <UserButton appearance={{ elements: { avatarBox: 'rounded-none' } }} />
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10">
        <ProfileCard
          email={user.email}
          orgId={user.orgId}
          publishedCount={Number(publishedRow?.count ?? 0)}
          subscriberCount={Number(subscriberRow?.count ?? 0)}
        />

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link
            href="/app"
            className="border border-rule bg-canvas-2 px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-ink-2 hover:text-ink"
          >
            ← back to documents
          </Link>
          <Link
            href={`/v/${userId}`}
            className="border border-rule bg-canvas-2 px-4 py-3 text-center font-mono text-xs uppercase tracking-widest text-ink-2 hover:text-ink"
          >
            public profile
          </Link>
        </div>
      </section>
    </main>
  );
}
