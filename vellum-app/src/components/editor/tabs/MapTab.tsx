'use client';

import { useCallback, useEffect, useState } from 'react';

interface ClaimNode {
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
  claims: ClaimNode[];
  edges: Edge[];
}

export function MapTab({
  documentId,
  refreshKey,
}: {
  documentId: string;
  refreshKey: number;
}) {
  const [data, setData] = useState<MapData>({ claims: [], edges: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/documents/${documentId}/argument-map`);
      if (r.ok) {
        const d = (await r.json()) as MapData;
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const { claims, edges } = data;

  // group claims by type for the v1 map (full force-graph viz comes later)
  const grouped: Record<string, ClaimNode[]> = {
    factual: [],
    evidence: [],
    opinion: [],
    speculation: [],
    question: [],
  };
  for (const c of claims) {
    (grouped[c.type] ?? grouped['factual'])?.push(c);
  }

  return (
    <div className="px-4 py-4">
      <header className="mb-3 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-ink-3">
        <span>argument map</span>
        <span>{loading ? '…' : `${claims.length} · ${edges.length} edges`}</span>
      </header>

      {claims.length === 0 ? (
        <p className="font-serif text-sm text-ink-3">
          the structure of your argument will appear here as claims accumulate.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .filter(([, list]) => list.length > 0)
            .map(([type, list]) => (
              <section key={type}>
                <h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-3">
                  {type} · {list.length}
                </h4>
                <ul className="space-y-1.5 border-l-2 border-rule pl-3">
                  {list.map((c) => {
                    const incoming = edges.filter((e) => e.to === c.id);
                    const outgoing = edges.filter((e) => e.from === c.id);
                    return (
                      <li key={c.id} className="font-serif text-sm leading-snug text-ink">
                        {c.text}
                        {(incoming.length > 0 || outgoing.length > 0) && (
                          <div className="mt-0.5 flex flex-wrap gap-2 font-mono text-[10px] text-ink-3">
                            {incoming.map((e, i) => (
                              <span key={`i-${i}`} className="rounded-none border border-rule bg-canvas px-1.5 py-0.5">
                                ← {e.type}
                              </span>
                            ))}
                            {outgoing.map((e, i) => (
                              <span key={`o-${i}`} className={`rounded-none border bg-canvas px-1.5 py-0.5 ${e.type === 'contradicts' ? 'border-amber-700 text-amber-800' : 'border-rule'}`}>
                                {e.type} →
                              </span>
                            ))}
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
    </div>
  );
}
