'use client';

import { useState } from 'react';
import { Editor } from '@/components/editor/Editor';
import { SidePane } from '@/components/editor/SidePane';
import { TypewriterMachine } from '@/components/landing/TypewriterMachine';

export function DocumentSurface({ documentId }: { documentId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastChar, setLastChar] = useState('');
  const [pressTick, setPressTick] = useState(0);
  const [paragraphs, setParagraphs] = useState<string[]>([]);

  return (
    <>
      {/* mobile / tablet: writing serious essays on a phone is a bad idea — show a clean notice instead */}
      <section className="flex h-full items-center justify-center bg-canvas px-6 py-12 lg:hidden">
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

      {/* desktop */}
      <div className="hidden h-full grid-cols-[1fr_360px] lg:grid">
        <div className="flex flex-col overflow-y-auto">
          <Editor
            documentId={documentId}
            onClaimsDetected={() => setRefreshKey((k) => k + 1)}
            onKeystroke={(char) => {
              setLastChar(char);
              setPressTick((t) => t + 1);
            }}
            onParagraphsChange={setParagraphs}
          />
          <div className="mt-auto border-t border-rule bg-canvas-2 px-5 py-5">
            <TypewriterMachine lastChar={lastChar} pressTick={pressTick} />
          </div>
        </div>
        <SidePane documentId={documentId} refreshKey={refreshKey} paragraphs={paragraphs} />
      </div>
    </>
  );
}
