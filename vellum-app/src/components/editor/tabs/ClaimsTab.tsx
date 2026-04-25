'use client';

import { useCallback, useEffect, useState } from 'react';

interface ClaimNode {
  id: string;
  text: string;
  type: string;
  confidence: number;
}

export function ClaimsTab({
  documentId,
  refreshKey,
}: {
  documentId: string;
  refreshKey: number;
}) {
  const [claims, setClaims] = useState<ClaimNode[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/documents/${documentId}/claims`);
      if (r.ok) {
        const data = (await r.json()) as { claims: ClaimNode[] };
        setClaims(data.claims);
      }
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className="px-4 py-4">
      <header className="mb-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-ink-3">
        <span>marks</span>
        <span>{loading ? '…' : `${claims.length} mark${claims.length === 1 ? '' : 's'}`}</span>
      </header>

      {loading && claims.length === 0 ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="border border-rule bg-canvas p-2">
              <div className="skeleton h-2 w-24" />
              <div className="skeleton mt-2 h-3 w-full" />
              <div className="skeleton mt-1 h-3 w-3/4" />
            </li>
          ))}
        </ul>
      ) : claims.length === 0 && !loading ? (
        <p className="font-serif text-sm text-ink-3">
          start typing — marks appear as the detector runs.
        </p>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {claims.map((c) => (
            <li key={c.id} className="border border-rule bg-canvas p-2">
              <div className="text-ink-3 uppercase tracking-wide">
                {c.type} · {Number(c.confidence).toFixed(2)}
              </div>
              <div className="mt-1 font-serif text-sm text-ink">{c.text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
