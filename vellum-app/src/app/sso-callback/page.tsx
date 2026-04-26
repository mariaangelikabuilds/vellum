'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
        signing you in…
      </p>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
