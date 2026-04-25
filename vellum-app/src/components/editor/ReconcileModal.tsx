'use client';

import { useEffect, useState } from 'react';

interface ReconcileResult {
  rewrite: string;
  reasoning: string;
  preserves: string[];
  drops: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  documentId: string;
  paragraphs: string[];
  /** the two contradicting marks */
  fromText: string;
  toText: string;
}

export function ReconcileModal({
  open,
  onClose,
  documentId,
  paragraphs,
  fromText,
  toText,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/claims/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            claimAText: fromText,
            claimBText: toText,
            documentContext: paragraphs.join('\n\n').slice(0, 8000),
          }),
        });
        if (cancelled) return;
        if (r.ok) {
          setResult((await r.json()) as ReconcileResult);
        } else {
          const body = (await r.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `${r.status}`);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'unknown');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, documentId, fromText, toText, paragraphs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-10">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto border border-rule-strong bg-canvas">
        <header className="flex items-baseline justify-between border-b border-rule px-6 py-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-3">reconcile</h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-ink-2 hover:text-ink"
          >
            close
          </button>
        </header>

        <div className="px-6 py-5">
          <section className="mb-5 grid grid-cols-2 gap-px border border-rule bg-rule">
            <div className="bg-canvas-2 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">a</p>
              <p className="font-serif text-sm leading-snug text-ink">{fromText}</p>
            </div>
            <div className="bg-canvas-2 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">b</p>
              <p className="font-serif text-sm leading-snug text-ink">{toText}</p>
            </div>
          </section>

          {loading && (
            <p className="font-mono text-xs text-ink-3">drafting a unified rewrite…</p>
          )}

          {error && <p className="font-mono text-xs text-red-600">{error}</p>}

          {result && (
            <div className="space-y-4">
              <section className="border border-rule-strong bg-canvas-2 p-4">
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-3">
                  proposed rewrite
                </p>
                <p className="font-serif text-base leading-relaxed text-ink">{result.rewrite}</p>
              </section>

              <section>
                <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">
                  reasoning
                </p>
                <p className="font-serif text-sm italic text-ink-2">{result.reasoning}</p>
              </section>

              {result.preserves.length > 0 && (
                <section>
                  <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">
                    preserved
                  </p>
                  <ul className="space-y-1 font-mono text-xs text-ink">
                    {result.preserves.map((p, i) => (
                      <li key={i}>+ {p}</li>
                    ))}
                  </ul>
                </section>
              )}

              {result.drops.length > 0 && (
                <section>
                  <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">
                    dropped
                  </p>
                  <ul className="space-y-1 font-mono text-xs text-ink-2">
                    {result.drops.map((d, i) => (
                      <li key={i}>− {d}</li>
                    ))}
                  </ul>
                </section>
              )}

              <footer className="flex justify-end gap-3 border-t border-rule pt-4">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(result.rewrite)}
                  className="border border-rule-strong bg-canvas px-4 py-2 font-mono text-xs text-ink hover:bg-canvas-2"
                >
                  copy rewrite
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-rule-strong bg-ink px-4 py-2 font-mono text-xs text-canvas hover:bg-ink-2"
                >
                  done
                </button>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
