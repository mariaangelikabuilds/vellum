'use client';

import { ClaimsTab } from './tabs/ClaimsTab';
import { SourcesTab } from './tabs/SourcesTab';
import { MapTab } from './tabs/MapTab';
import { CriticTab } from './tabs/CriticTab';
import { OutlineTab } from './tabs/OutlineTab';

export type TabId = 'marks' | 'sources' | 'map' | 'outline' | 'critic';

interface Props {
  documentId: string;
  refreshKey: number;
  /** parent provides the current paragraphs so Critic / Outline can run on them */
  paragraphs: string[];
  /** controlled tab state (lifted to surface so command palette can switch) */
  tab: TabId;
  setTab: (tab: TabId) => void;
}

export function SidePane({ documentId, refreshKey, paragraphs, tab, setTab }: Props) {

  const tabs: { id: TabId; label: string }[] = [
    { id: 'marks', label: 'marks' },
    { id: 'sources', label: 'sources' },
    { id: 'map', label: 'map' },
    { id: 'outline', label: 'outline' },
    { id: 'critic', label: 'critic' },
  ];

  return (
    <aside className="flex flex-col border-l border-rule bg-canvas-2">
      <nav className="grid grid-cols-5 border-b border-rule font-mono text-xs uppercase tracking-widest">
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
        {tab === 'marks' && (
          <ClaimsTab documentId={documentId} refreshKey={refreshKey} />
        )}
        {tab === 'sources' && <SourcesTab documentId={documentId} />}
        {tab === 'map' && (
          <MapTab documentId={documentId} refreshKey={refreshKey} paragraphs={paragraphs} />
        )}
        {tab === 'outline' && (
          <OutlineTab documentId={documentId} paragraphs={paragraphs} />
        )}
        {tab === 'critic' && (
          <CriticTab documentId={documentId} paragraphs={paragraphs} />
        )}
      </div>
    </aside>
  );
}
