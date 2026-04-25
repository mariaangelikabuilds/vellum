'use client';

import { useState } from 'react';

interface OutlineBullet {
  claim: string;
  kind: 'premise' | 'conclusion' | 'evidence' | 'counterargument' | 'aside';
  paragraphIndex: number;
}

interface OutlineData {
  summary: string;
  bullets: OutlineBullet[];
  coherence: { rating: 'low' | 'medium' | 'high'; note: string };
}

const KIND_GLYPH: Record<OutlineBullet['kind'], string> = {
  premise: '◇',
  conclusion: '◆',
  evidence: '⌖',
  counterargument: '⤴',
  aside: '·',
};

export function OutlineTab({
  documentId,
  paragraphs,
}: {
  documentId: string;
  paragraphs: string[];
}) {
  const [data, setData] = useState<OutlineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (paragraphs.length === 0) {
      setError('write something first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/documents/${documentId}/outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphs }),
      });
      if (r.ok) {
        const d = (await r.json()) as OutlineData;
        setData(d);
      } else {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `${r.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <header className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
        reverse outline
      </header>

      <button
        type="button"
        onClick={run}
        disabled={loading || paragraphs.length === 0}
        className="mb-4 w-full border border-rule-strong bg-ink px-3 py-2 font-mono text-xs text-canvas hover:bg-ink-2 disabled:opacity-40"
      >
        {loading ? 'reading what you wrote…' : 'outline this'}
      </button>

      {error && <p className="mb-2 font-mono text-xs text-red-600">{error}</p>}

      {!data && !loading ? (
        <p className="font-serif text-sm text-ink-3">
          a reverse outline shows the bullet structure of what you actually wrote — not what you
          meant to write. tests coherence in two seconds.
        </p>
      ) : data ? (
        <div className="space-y-4">
          <section className="border border-rule-strong p-3">
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">
              summary
            </p>
            <p className="font-serif text-sm leading-snug text-ink">{data.summary}</p>
          </section>

          <section>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-3">
              structure
            </p>
            <ul className="space-y-2 border-l-2 border-rule pl-3 font-serif text-sm leading-snug text-ink">
              {data.bullets.map((b, i) => (
                <li key={i}>
                  <span className="mr-2 inline-block w-4 text-center font-mono text-ink-3">
                    {KIND_GLYPH[b.kind]}
                  </span>
                  {b.claim}
                  <span className="ml-1 font-mono text-xs text-ink-3">¶{b.paragraphIndex}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className={`border-l-2 p-3 ${
              data.coherence.rating === 'high'
                ? 'border-l-rule-strong'
                : data.coherence.rating === 'medium'
                ? 'border-l-amber-500'
                : 'border-l-amber-700'
            }`}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
              coherence · {data.coherence.rating}
            </p>
            <p className="mt-1 font-serif text-sm leading-snug text-ink">{data.coherence.note}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
