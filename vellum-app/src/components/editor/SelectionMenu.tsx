'use client';

import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { useState } from 'react';

interface Synonym {
  word: string;
  connotation: string;
  register?: 'formal' | 'neutral' | 'informal';
}

interface Explanation {
  plain: string;
  unpacks: string[];
}

type Mode = 'idle' | 'synonyms' | 'explain' | 'loading';

interface Props {
  editor: TiptapEditor | null;
  paragraphs: string[];
}

export function SelectionMenu({ editor, paragraphs }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!editor) return null;

  const reset = () => {
    setMode('idle');
    setSynonyms([]);
    setExplanation(null);
    setError(null);
  };

  const getSelectedText = (): string => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ').trim();
  };

  const getEnclosingSentence = (): string => {
    // crude: take the paragraph containing the selection
    const { $from } = editor.state.selection;
    const block = $from.node($from.depth);
    return block?.textContent ?? '';
  };

  const fetchSynonyms = async () => {
    const word = getSelectedText();
    const sentence = getEnclosingSentence();
    if (!word) return;
    setMode('loading');
    setError(null);
    try {
      const r = await fetch('/api/text/synonyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, sentence }),
      });
      if (r.ok) {
        const data = (await r.json()) as { alternatives: Synonym[] };
        setSynonyms(data.alternatives);
        setMode('synonyms');
      } else {
        setError(`${r.status}`);
        setMode('idle');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
      setMode('idle');
    }
  };

  const fetchExplanation = async () => {
    const phrase = getSelectedText();
    if (!phrase) return;
    setMode('loading');
    setError(null);
    try {
      const r = await fetch('/api/text/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase,
          context: paragraphs.join('\n\n').slice(0, 6000),
        }),
      });
      if (r.ok) {
        const data = (await r.json()) as Explanation;
        setExplanation(data);
        setMode('explain');
      } else {
        setError(`${r.status}`);
        setMode('idle');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
      setMode('idle');
    }
  };

  const swap = (replacement: string) => {
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt({ from, to }, replacement).run();
    reset();
  };

  return (
    <BubbleMenu editor={editor} options={{ placement: 'top' }}>
      <div className="flex flex-col bg-canvas border border-rule-strong shadow-sm">
        {mode === 'idle' && (
          <div className="flex font-mono text-[11px] uppercase tracking-widest">
            <button
              type="button"
              onClick={fetchSynonyms}
              className="border-r border-rule px-3 py-2 text-ink-2 hover:bg-canvas-2 hover:text-ink"
            >
              synonyms
            </button>
            <button
              type="button"
              onClick={fetchExplanation}
              className="px-3 py-2 text-ink-2 hover:bg-canvas-2 hover:text-ink"
            >
              explain
            </button>
          </div>
        )}

        {mode === 'loading' && (
          <p className="px-3 py-2 font-mono text-[11px] text-ink-3">working…</p>
        )}

        {mode === 'synonyms' && (
          <div className="max-w-xs px-3 py-2">
            <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-ink-3">
              <span>alternatives</span>
              <button type="button" onClick={reset} className="hover:text-ink">
                close
              </button>
            </div>
            <ul className="space-y-1.5">
              {synonyms.map((s) => (
                <li key={s.word}>
                  <button
                    type="button"
                    onClick={() => swap(s.word)}
                    className="block w-full text-left hover:bg-canvas-2"
                  >
                    <span className="font-serif text-sm text-ink">{s.word}</span>
                    <span className="ml-2 font-mono text-[10px] text-ink-3">
                      {s.register ? `${s.register} · ` : ''}
                      {s.connotation}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === 'explain' && explanation && (
          <div className="max-w-sm px-3 py-2">
            <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-ink-3">
              <span>plain reading</span>
              <button type="button" onClick={reset} className="hover:text-ink">
                close
              </button>
            </div>
            <p className="mb-2 font-serif text-sm leading-snug text-ink">
              {explanation.plain}
            </p>
            {explanation.unpacks.length > 0 && (
              <>
                <p className="mt-2 mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-3">
                  unpacked
                </p>
                <ul className="space-y-0.5 font-serif text-xs leading-snug text-ink-2">
                  {explanation.unpacks.map((u, i) => (
                    <li key={i}>· {u}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {error && <p className="px-3 py-2 font-mono text-[11px] text-red-600">{error}</p>}
      </div>
    </BubbleMenu>
  );
}
