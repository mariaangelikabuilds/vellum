import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { NewDocButton } from './new-doc-button';

export default async function AppPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await syncCurrentUser();

  const docs = user.orgId
    ? await db
        .select({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt })
        .from(documents)
        .where(eq(documents.orgId, user.orgId))
        .orderBy(desc(documents.updatedAt))
    : [];

  return (
    <main className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-rule px-6 py-4">
        <h1 className="font-mono text-lg">vellum</h1>
        <div className="flex items-center gap-4">
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                rootBox: 'rounded-none',
                organizationSwitcherTrigger: 'rounded-none border border-rule-strong',
              },
            }}
          />
          <UserButton appearance={{ elements: { avatarBox: 'rounded-none' } }} />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <p className="font-mono text-sm text-ink-2">
            signed in as <span className="text-ink">{user.email}</span>
            {user.orgId ? ` · org ${user.orgId.slice(0, 8)}…` : ' · no active org'}
          </p>
          <NewDocButton />
        </div>

        {docs.length === 0 ? (
          <p className="font-mono text-sm text-ink-3">no documents yet — start writing.</p>
        ) : (
          <ul className="divide-y divide-rule border border-rule">
            {docs.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/app/doc/${d.id}`}
                  className="block px-4 py-3 hover:bg-canvas-2 font-mono text-sm"
                >
                  <div className="text-ink">{d.title}</div>
                  <div className="text-xs text-ink-3">
                    updated {new Date(d.updatedAt).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
