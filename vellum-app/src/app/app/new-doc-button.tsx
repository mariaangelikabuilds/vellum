'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function NewDocButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const r = await fetch('/api/documents/new', { method: 'POST' });
          if (r.ok) {
            const { id } = (await r.json()) as { id: string };
            router.push(`/app/doc/${id}`);
          }
        })
      }
      disabled={isPending}
      className="border border-rule-strong bg-ink px-4 py-2 font-mono text-sm text-canvas hover:bg-ink-2 disabled:opacity-50"
    >
      {isPending ? 'creating…' : 'new document'}
    </button>
  );
}
