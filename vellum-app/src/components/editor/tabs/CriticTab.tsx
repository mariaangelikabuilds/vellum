'use client';

import { useState } from 'react';

interface CriticNote {
  severity: 'low' | 'medium' | 'high';
  kind: string;
  paragraphIndex: number;
  comment: string;
  suggestion?: string;
}

const KIND_LABEL: Record<string, string> = {
  weak_premise: 'weak premise',
  unsupported_claim: 'unsupported claim',
  missing_counterargument: 'missing counterargument',
  leap_in_logic: 'leap in logic',
  tone_drift: 'tone drift',
  overclaim: 'overclaim',
  circular: 'circular',
};

export function CriticTab({
  documentId,
  paragraphs,
}: {
  documentId: string;
  paragraphs: string[];
}) {
  const [notes, setNotes] = useState<CriticNote[]>([]);
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
      const r = await fetch(`/api/documents/${documentId}/critique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphs }),
      });
      if (r.ok) {
        const data = (await r.json()) as { notes: CriticNote[] };
        setNotes(data.notes);
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
      <header className="mb-3 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-ink-3">
        <span>hostile review</span>
        {notes.length > 0 && <span>{notes.length} note{notes.length === 1 ? '' : 's'}</span>}
      </header>

      <button
        type="button"
        onClick={run}
        disabled={loading || paragraphs.length === 0}
        className="mb-4 w-full border border-rule-strong bg-ink px-3 py-2 font-mono text-xs text-canvas hover:bg-ink-2 disabled:opacity-40"
      >
        {loading ? 'reading as a hostile editor…' : 'run critic'}
      </button>

      {error && <p className="mb-2 font-mono text-xs text-red-600">{error}</p>}

      {notes.length === 0 && !loading ? (
        <p className="font-serif text-sm text-ink-3">
          a senior critic from The New York Review of Books reads your draft and marks every weak
          premise, leap in logic, missing counterargument, or overclaim. click run to begin.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n, i) => (
            <li
              key={i}
              className={`border-l-2 border-rule bg-canvas p-3 ${
                n.severity === 'high'
                  ? 'border-l-amber-700'
                  : n.severity === 'medium'
                  ? 'border-l-amber-500'
                  : 'border-l-rule'
              }`}
            >
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-ink-3">
                <span>{KIND_LABEL[n.kind] ?? n.kind}</span>
                <span>¶ {n.paragraphIndex} · {n.severity}</span>
              </div>
              <p className="mt-1.5 font-serif text-sm leading-snug text-ink">{n.comment}</p>
              {n.suggestion && (
                <p className="mt-2 border-l border-rule pl-2 font-serif text-xs italic text-ink-2">
                  {n.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
