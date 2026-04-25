'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function NewDocButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await fetch('/api/documents/new', { method: 'POST' });
            if (r.ok) {
              const { id } = (await r.json()) as { id: string };
              router.push(`/app/doc/${id}`);
            } else {
              const body = (await r.json().catch(() => ({}))) as { error?: string };
              setError(body.error ?? `${r.status} ${r.statusText}`);
            }
          })
        }
        disabled={isPending}
        className="border border-rule-strong bg-ink px-4 py-2 font-mono text-sm text-canvas hover:bg-ink-2 disabled:opacity-50"
      >
        {isPending ? 'creating…' : 'new document'}
      </button>
      {error && <p className="font-mono text-xs text-red-600">{error}</p>}
    </div>
  );
}
