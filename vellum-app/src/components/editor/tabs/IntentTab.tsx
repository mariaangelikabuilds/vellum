'use client';

import { useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';

type Kind = 'miss' | 'bury' | 'drift' | 'land';

interface Mark {
  kind: Kind;
  quote: string;
  why: string;
  suggestion?: string;
}

const KIND_LABEL: Record<Kind, string> = {
  miss: 'miss',
  bury: 'bury',
  drift: 'drift',
  land: 'land',
};

const KIND_BG: Record<Kind, string> = {
  miss: 'bg-stone-100',
  bury: 'bg-rose-50',
  drift: 'bg-amber-100',
  land: 'bg-emerald-50',
};

interface Props {
  paragraphs: string[];
  intent: string;
  editor: TiptapEditor | null;
}

export function IntentTab({ paragraphs, intent, editor }: Props) {
  const [reading, setReading] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasRead, setHasRead] = useState(false);

  const text = paragraphs.join('\n\n').trim();
  const intentSet = intent.trim().length >= 4;

  const onRead = async () => {
    if (reading) return;
    setError(null);
    if (!intentSet) {
      setError('Set what you mean above first.');
      return;
    }
    if (!text) {
      setError('Write something to read against the intent.');
      return;
    }

    setReading(true);
    try {
      const r = await fetch('/api/text/intent-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, intent }),
      });
      if (!r.ok) {
        setError(r.status === 429 ? 'Slow down a moment.' : 'Read failed.');
        return;
      }
      const data = (await r.json()) as { located: Array<Mark & { start: number; end: number }> };
      setMarks(data.located);
      setHasRead(true);
      if (editor) applyIntentMarks(editor, data.located);
    } catch {
      setError('Read failed.');
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="px-5 py-5">
      {!intentSet ? (
        <p className="font-serif italic text-ink-2">Set what you mean above. The page reads against it.</p>
      ) : (
        <>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-3">reading for</p>
          <p className="mb-5 border-l-2 border-rule pl-3 font-serif italic text-ink-2">{intent}</p>

          <button
            type="button"
            onClick={onRead}
            disabled={reading || !text}
            className="mb-5 w-full border border-rule-strong bg-ink px-4 py-2 font-mono text-xs uppercase tracking-widest text-canvas hover:bg-ink-2 disabled:opacity-50"
          >
            {reading ? 'reading…' : hasRead ? 'read again' : 'read'}
          </button>

          {error && (
            <p className="mb-5 border border-red-300 bg-red-50 px-3 py-2 font-serif text-sm text-red-900">
              {error}
            </p>
          )}

          {hasRead && marks.length === 0 && !error && (
            <p className="font-serif italic text-ink-2">Nothing misses.</p>
          )}

          {marks.length > 0 && (
            <ul className="space-y-4">
              {marks.map((m, i) => (
                <li key={i} className="border border-rule bg-canvas">
                  <div className="border-b border-rule px-3 py-2">
                    <span
                      className={`mr-2 inline-block px-1.5 font-mono text-[10px] uppercase tracking-widest text-ink ${KIND_BG[m.kind]}`}
                    >
                      {KIND_LABEL[m.kind]}
                    </span>
                    <span className="font-serif text-sm text-ink-2">{m.why}</span>
                  </div>
                  <blockquote className={`px-3 py-2 font-serif text-sm italic text-ink ${KIND_BG[m.kind]}`}>
                    {m.quote}
                  </blockquote>
                  {m.suggestion && (
                    <div className="border-t border-rule px-3 py-2">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-3">try</p>
                      <p className="font-serif text-sm text-ink">{m.suggestion}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function applyIntentMarks(
  editor: TiptapEditor,
  marks: Array<Mark & { start: number; end: number }>,
) {
  const { state } = editor;
  const markType = state.schema.marks.intentMark;
  if (!markType) return;

  let tr = state.tr.setMeta('addToHistory', false);
  tr = tr.removeMark(0, state.doc.content.size, markType);

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    for (const m of marks) {
      const idx = text.indexOf(m.quote);
      if (idx >= 0) {
        const from = pos + idx;
        const to = from + m.quote.length;
        tr = tr.addMark(
          from,
          to,
          markType.create({
            kind: m.kind,
            why: m.why,
            suggestion: m.suggestion ?? null,
          }),
        );
      }
    }
  });

  editor.view.dispatch(tr);
}
