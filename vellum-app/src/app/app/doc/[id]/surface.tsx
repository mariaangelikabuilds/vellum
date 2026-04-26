'use client';

import { useEffect, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Editor } from '@/components/editor/Editor';
import { SidePane } from '@/components/editor/SidePane';
import { TypewriterMachine } from '@/components/landing/TypewriterMachine';
import { CowriterBar } from '@/components/editor/CowriterBar';
import { SelectionMenu } from '@/components/editor/SelectionMenu';
import { DocumentChrome } from '@/components/editor/DocumentChrome';
import { CommandPalette } from '@/components/editor/CommandPalette';
import type { TabId } from '@/components/editor/SidePane';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { toast } from 'sonner';

export function DocumentSurface({
  documentId,
  initialProseText,
  initialTitle,
  initialTags,
  initialPublished,
}: {
  documentId: string;
  initialProseText?: string;
  initialTitle: string;
  initialTags: string[];
  initialPublished: boolean;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastChar, setLastChar] = useState('');
  const [pressTick, setPressTick] = useState(0);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const [tab, setTab] = useState<TabId>('marks');

  // debounced PATCH of proseText so the public viewer + search read fresh content
  const debouncedSaveProse = useDebounce(async (proseText: string) => {
    await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proseText }),
    });
  }, 1500);

  useEffect(() => {
    if (paragraphs.length === 0) return;
    debouncedSaveProse(paragraphs.join('\n\n'));
  }, [paragraphs, debouncedSaveProse]);

  return (
    <>
      <DocumentChrome
        documentId={documentId}
        initialTitle={initialTitle}
        initialTags={initialTags}
        initialPublished={initialPublished}
        paragraphs={paragraphs}
      />

      {/* mobile / tablet: writing serious essays on a phone is a bad idea — show a clean notice instead */}
      <section className="flex flex-1 items-center justify-center bg-canvas px-6 py-12 lg:hidden">
        <div className="max-w-sm border border-rule-strong bg-canvas-2 p-6">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ink-3">
            best on desktop
          </p>
          <h2 className="mb-3 font-serif text-2xl leading-snug text-ink">
            Vellum&rsquo;s editor wants a wider canvas.
          </h2>
          <p className="mb-4 font-serif text-sm leading-relaxed text-ink-2">
            The claim graph, the writing surface, and the typewriter live side-by-side. They need
            room to breathe. Open this link on a laptop and the page returns.
          </p>
          <p className="font-mono text-xs text-ink-3">
            (a mobile read-only view is on the way.)
          </p>
        </div>
      </section>

      {/* desktop — full-viewport grid; scroll lives inside the editor canvas only */}
      <div className="hidden flex-1 grid-cols-[1fr_360px] overflow-hidden lg:grid">
        {/* editor column: scrollable canvas on top, fixed cowriter + typewriter on bottom */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* the writing canvas — only this scrolls */}
          <div className="flex-1 overflow-y-auto">
            <Editor
              documentId={documentId}
              initialContent={initialProseText}
              onClaimsDetected={() => setRefreshKey((k) => k + 1)}
              onKeystroke={(char) => {
                setLastChar(char);
                setPressTick((t) => t + 1);
              }}
              onParagraphsChange={setParagraphs}
              onEditorReady={setEditorInstance}
            />
            <SelectionMenu editor={editorInstance} paragraphs={paragraphs} />
          </div>
          {/* pinned bottom dock — cowriter + typewriter, always visible */}
          <div className="shrink-0">
            <CowriterBar
              documentId={documentId}
              paragraphs={paragraphs}
              editor={editorInstance}
            />
            <div className="border-t border-rule bg-canvas-2 px-5 py-3">
              <TypewriterMachine lastChar={lastChar} pressTick={pressTick} />
            </div>
          </div>
        </div>
        {/* side-pane column: own internal scroll already lives inside SidePane */}
        <SidePane
          documentId={documentId}
          refreshKey={refreshKey}
          paragraphs={paragraphs}
          tab={tab}
          setTab={setTab}
        />
      </div>

      <CommandPalette
        onRunCritic={() => setTab('critic')}
        onRunOutline={() => setTab('outline')}
        onScanContradictions={() => setTab('map')}
        onRunVoiceCheck={() => {
          toast('voice check is in the document chrome', {
            description: 'top right · click the chip',
          });
        }}
        onContinueWriting={() => {
          toast('continue ↳ is in the dock', {
            description: 'just below the writing canvas',
          });
        }}
        onTogglePublish={() => {
          toast('publish toggle is in the document chrome', {
            description: 'next to title · top right',
          });
        }}
        onCopyShareUrl={() => {
          if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(`${window.location.origin}/v/${documentId}`);
            toast('share URL copied', { description: `/v/${documentId}` });
          }
        }}
      />
    </>
  );
}
