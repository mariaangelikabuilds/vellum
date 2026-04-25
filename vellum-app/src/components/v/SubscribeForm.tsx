'use client';

import { useState } from 'react';

export function SubscribeForm({ documentId }: { documentId: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState('sending');
    setError(null);
    try {
      const r = await fetch(`/api/v1/essays/${documentId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (r.ok) {
        setState('done');
      } else {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'failed');
        setState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p className="font-mono text-xs text-ink-2">
        subscribed — you&rsquo;ll get the next essay by email.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-stretch gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your email"
        required
        className="flex-1 min-w-[200px] border border-rule bg-canvas px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-rule-strong focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="border border-rule-strong bg-ink px-3 py-2 font-mono text-xs text-canvas hover:bg-ink-2 disabled:opacity-40"
      >
        {state === 'sending' ? 'subscribing…' : 'subscribe'}
      </button>
      {error && <p className="w-full font-mono text-xs text-red-600">{error}</p>}
    </form>
  );
}
