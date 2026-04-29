'use client';

import type { Editor as TiptapEditor } from '@tiptap/react';
import { ClaimsTab } from './tabs/ClaimsTab';
import { SourcesTab } from './tabs/SourcesTab';
import { MapTab } from './tabs/MapTab';
import { CriticTab } from './tabs/CriticTab';
import { OutlineTab } from './tabs/OutlineTab';
import { IntentTab } from './tabs/IntentTab';

export type TabId = 'marks' | 'sources' | 'map' | 'outline' | 'critic' | 'intent';

interface Props {
  documentId: string;
  refreshKey: number;
  /** parent provides the current paragraphs so Critic / Outline can run on them */
  paragraphs: string[];
  /** controlled tab state (lifted to surface so command palette can switch) */
  tab: TabId;
  setTab: (tab: TabId) => void;
  /** which lens the document is in. shapes which tabs render. */
  mode: 'researcher' | 'freeform';
  /** declared writing intent, only meaningful in freeform mode */
  intent: string;
  /** Tiptap instance, used by IntentTab to paint marks on the canvas */
  editor: TiptapEditor | null;
}

export function SidePane({
  documentId,
  refreshKey,
  paragraphs,
  tab,
  setTab,
  mode,
  intent,
  editor,
}: Props) {
  const tabs: { id: TabId; label: string }[] =
    mode === 'freeform'
      ? [{ id: 'intent', label: 'intent' }]
      : [
          { id: 'marks', label: 'marks' },
          { id: 'sources', label: 'sources' },
          { id: 'map', label: 'map' },
          { id: 'outline', label: 'outline' },
          { id: 'critic', label: 'critic' },
        ];

  const cols = mode === 'freeform' ? 'grid-cols-1' : 'grid-cols-5';

  return (
    <aside className="flex flex-col border-l border-rule bg-canvas-2">
      <nav className={`grid ${cols} border-b border-rule font-mono text-xs uppercase tracking-widest`}>
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
        {mode === 'researcher' && tab === 'marks' && (
          <ClaimsTab documentId={documentId} refreshKey={refreshKey} />
        )}
        {mode === 'researcher' && tab === 'sources' && <SourcesTab documentId={documentId} />}
        {mode === 'researcher' && tab === 'map' && (
          <MapTab documentId={documentId} refreshKey={refreshKey} paragraphs={paragraphs} />
        )}
        {mode === 'researcher' && tab === 'outline' && (
          <OutlineTab documentId={documentId} paragraphs={paragraphs} />
        )}
        {mode === 'researcher' && tab === 'critic' && (
          <CriticTab documentId={documentId} paragraphs={paragraphs} />
        )}
        {mode === 'freeform' && (
          <IntentTab paragraphs={paragraphs} intent={intent} editor={editor} />
        )}
      </div>
    </aside>
  );
}
