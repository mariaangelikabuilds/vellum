import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { syncCurrentUser } from '@/lib/auth/sync-user';

export default async function AppPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await syncCurrentUser();

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

      <section className="px-6 py-8">
        <p className="font-mono text-sm text-ink-2">
          signed in as <span className="text-ink">{user.email}</span>
          {user.orgId ? ` · org ${user.orgId.slice(0, 8)}…` : ' · no active org'}
        </p>
        <p className="mt-2 font-mono text-sm text-ink-3">
          documents list will land here in section 7
        </p>
      </section>
    </main>
  );
}
