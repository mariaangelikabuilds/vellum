'use client';

import { useCallback, useEffect, useState } from 'react';

interface ClaimNode {
  id: string;
  text: string;
  type: string;
  confidence: number;
}

interface Props {
  documentId: string;
  /** Bumped by the editor whenever new claims are detected so the pane refetches. */
  refreshKey: number;
}

export function ClaimGraphPane({ documentId, refreshKey }: Props) {
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
    <aside className="border-l border-rule bg-canvas-2 p-4">
      <header className="mb-3 flex items-baseline justify-between font-mono text-xs text-ink-2">
        <span>claim graph</span>
        <span>{loading ? '…' : `${claims.length} claim${claims.length === 1 ? '' : 's'}`}</span>
      </header>

      {claims.length === 0 && !loading ? (
        <p className="font-mono text-xs text-ink-3">
          start typing — claims will appear as Haiku detects them.
        </p>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {claims.map((c) => (
            <li
              key={c.id}
              className="border border-rule bg-canvas p-2"
            >
              <div className="text-ink-3 uppercase tracking-wide">
                {c.type} · {Number(c.confidence).toFixed(2)}
              </div>
              <div className="mt-1 text-ink">{c.text}</div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
