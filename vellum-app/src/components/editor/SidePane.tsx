'use client';

import { useState } from 'react';
import { ClaimsTab } from './tabs/ClaimsTab';
import { SourcesTab } from './tabs/SourcesTab';
import { MapTab } from './tabs/MapTab';
import { CriticTab } from './tabs/CriticTab';

type TabId = 'claims' | 'sources' | 'map' | 'critic';

interface Props {
  documentId: string;
  refreshKey: number;
  /** parent provides the current paragraphs so Critic / Outline can run on them */
  paragraphs: string[];
}

export function SidePane({ documentId, refreshKey, paragraphs }: Props) {
  const [tab, setTab] = useState<TabId>('claims');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'claims', label: 'claims' },
    { id: 'sources', label: 'sources' },
    { id: 'map', label: 'map' },
    { id: 'critic', label: 'critic' },
  ];

  return (
    <aside className="flex flex-col border-l border-rule bg-canvas-2">
      <nav className="grid grid-cols-4 border-b border-rule font-mono text-[11px] uppercase tracking-widest">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-r border-rule px-3 py-3 last:border-r-0 ${
              tab === t.id ? 'bg-canvas text-ink' : 'text-ink-3 hover:bg-canvas hover:text-ink-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {tab === 'claims' && (
          <ClaimsTab documentId={documentId} refreshKey={refreshKey} />
        )}
        {tab === 'sources' && <SourcesTab documentId={documentId} />}
        {tab === 'map' && <MapTab documentId={documentId} refreshKey={refreshKey} />}
        {tab === 'critic' && (
          <CriticTab documentId={documentId} paragraphs={paragraphs} />
        )}
      </div>
    </aside>
  );
}
