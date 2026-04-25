'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReconcileModal } from '../ReconcileModal';

interface MarkNode {
  id: string;
  text: string;
  type: string;
  confidence: number;
}

interface Edge {
  from: string;
  to: string;
  type: string;
  severity: string;
}

interface MapData {
  marks: MarkNode[];
  edges: Edge[];
}

interface Props {
  documentId: string;
  refreshKey: number;
  paragraphs?: string[];
}

const TYPE_ORDER = ['factual', 'evidence', 'opinion', 'speculation', 'question'] as const;

export function MapTab({ documentId, refreshKey, paragraphs = [] }: Props) {
  const [data, setData] = useState<MapData>({ marks: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconcilePair, setReconcilePair] = useState<{ from: string; to: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/documents/${documentId}/argument-map`);
      if (r.ok) {
        const d = (await r.json()) as { claims: MarkNode[]; edges: Edge[] };
        setData({ marks: d.claims, edges: d.edges });
      }
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const findContradictions = async () => {
    setScanning(true);
    setError(null);
    try {
      const r = await fetch(`/api/documents/${documentId}/find-contradictions`, {
        method: 'POST',
      });
      if (r.ok) {
        await load();
      } else {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `${r.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setScanning(false);
    }
  };

  const { marks, edges } = data;
  const grouped: Record<string, MarkNode[]> = {};
  for (const t of TYPE_ORDER) grouped[t] = [];
  for (const m of marks) {
    (grouped[m.type] ?? grouped['factual'])?.push(m);
  }

  const markById = (id: string) => marks.find((m) => m.id === id);

  return (
    <div className="px-4 py-4">
      <header className="mb-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-ink-3">
        <span>argument map</span>
        <span>{loading ? '…' : `${marks.length} · ${edges.length} edges`}</span>
      </header>

      <button
        type="button"
        onClick={findContradictions}
        disabled={scanning || marks.length < 2}
        className="mb-4 w-full border border-rule-strong bg-canvas px-3 py-2 font-mono text-xs text-ink hover:bg-canvas-2 disabled:opacity-40"
      >
        {scanning ? 'scanning for contradictions…' : 'scan for contradictions'}
      </button>

      {error && <p className="mb-2 font-mono text-xs text-red-600">{error}</p>}

      {marks.length === 0 ? (
        <p className="font-serif text-sm text-ink-3">
          the structure of your argument will appear here as marks accumulate.
        </p>
      ) : (
        <div className="space-y-4">
          {TYPE_ORDER.filter((t) => (grouped[t] ?? []).length > 0).map((type) => (
            <section key={type}>
              <h4 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-3">
                {type} · {grouped[type]?.length ?? 0}
              </h4>
              <ul className="space-y-1.5 border-l-2 border-rule pl-3">
                {(grouped[type] ?? []).map((m) => {
                  const incoming = edges.filter((e) => e.to === m.id);
                  const outgoing = edges.filter((e) => e.from === m.id);
                  return (
                    <li key={m.id} className="font-serif text-sm leading-snug text-ink">
                      {m.text}
                      {(incoming.length > 0 || outgoing.length > 0) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs text-ink-3">
                          {incoming.map((e, i) => (
                            <span
                              key={`i-${i}`}
                              className="border border-rule bg-canvas px-1.5 py-0.5"
                            >
                              ← {e.type}
                            </span>
                          ))}
                          {outgoing.map((e, i) => {
                            const target = markById(e.to);
                            const isContradiction = e.type === 'contradicts';
                            return (
                              <span
                                key={`o-${i}`}
                                className={`flex items-center gap-1 border bg-canvas px-1.5 py-0.5 ${isContradiction ? 'border-amber-700 text-amber-800' : 'border-rule'}`}
                              >
                                {e.type} →
                                {isContradiction && target && (
                                  <button
                                    type="button"
                                    onClick={() => setReconcilePair({ from: m.text, to: target.text })}
                                    className="ml-1 underline-offset-2 hover:underline"
                                  >
                                    reconcile
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ReconcileModal
        open={reconcilePair !== null}
        onClose={() => setReconcilePair(null)}
        documentId={documentId}
        paragraphs={paragraphs}
        fromText={reconcilePair?.from ?? ''}
        toText={reconcilePair?.to ?? ''}
      />
    </div>
  );
}
