'use client';

import { useCallback, useEffect, useState } from 'react';

interface Source {
  id: string;
  url: string | null;
  title: string | null;
  contentSnapshot: string;
  fetchedAt: string | null;
}

export function SourcesTab({ documentId }: { documentId: string }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/documents/${documentId}/bibliography`);
    if (r.ok) {
      const data = (await r.json()) as { sources: Source[] };
      setSources(data.sources);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/documents/${documentId}/bibliography`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (r.ok) {
        setUrl('');
        await load();
      } else {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `${r.status} ${r.statusText}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <header className="mb-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-ink-3">
        <span>bibliography</span>
        <span>{sources.length} source{sources.length === 1 ? '' : 's'}</span>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mb-4"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="paste a URL"
          className="w-full border border-rule-strong bg-canvas px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="mt-2 w-full border border-rule-strong bg-ink px-3 py-2 font-mono text-xs text-canvas hover:bg-ink-2 disabled:opacity-40"
        >
          {busy ? 'fetching + embedding…' : 'add to bibliography'}
        </button>
        {error && <p className="mt-2 font-mono text-xs text-red-600">{error}</p>}
      </form>

      {sources.length === 0 ? (
        <p className="font-serif text-sm text-ink-3">
          no sources yet. paste any URL. Penstroke fetches the page, embeds it via Voyage, and the
          verifier can cite from it.
        </p>
      ) : (
        <ul className="space-y-3 font-mono text-xs">
          {sources.map((s) => (
            <li key={s.id} className="border border-rule bg-canvas p-3">
              <p className="font-serif text-sm leading-snug text-ink">
                {s.title ?? s.url}
              </p>
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-ink-3 hover:text-ink"
                >
                  {s.url}
                </a>
              )}
              {s.contentSnapshot && (
                <p className="mt-2 line-clamp-3 font-serif text-xs leading-snug text-ink-2">
                  {s.contentSnapshot}…
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
