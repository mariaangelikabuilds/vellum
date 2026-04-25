'use client';

import type { Editor as TiptapEditor } from '@tiptap/react';
import { useState } from 'react';

interface Suggestion {
  continuation: string;
  reasoning: string;
  flagged: { span: string; kind: string; note: string }[];
}

interface Props {
  documentId: string;
  paragraphs: string[];
  editor: TiptapEditor | null;
}

export function CowriterBar({ documentId, paragraphs, editor }: Props) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (paragraphs.length === 0) {
      setError('write something first to continue from');
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const r = await fetch(`/api/documents/${documentId}/cowrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphs }),
      });
      if (r.ok) {
        setSuggestion((await r.json()) as Suggestion);
      } else {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `${r.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!editor || !suggestion) return;
    editor.chain().focus().command(({ tr, state, dispatch }) => {
      const endPos = state.doc.content.size;
      const para = state.schema.nodes.paragraph;
      if (!para || !dispatch) return false;
      tr.insert(endPos, para.create({}, state.schema.text(suggestion.continuation)));
      dispatch(tr);
      return true;
    }).run();
    setSuggestion(null);
  };

  const reject = () => setSuggestion(null);

  return (
    <div className="border-t border-rule bg-canvas-2 px-7 py-4">
      {!suggestion && !loading ? (
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] text-ink-3">
            stuck? sonnet will continue your thought, only with claims it can defend.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="border border-rule-strong bg-canvas px-3 py-1.5 font-mono text-xs text-ink hover:bg-canvas-2 disabled:opacity-40"
          >
            continue ↳
          </button>
        </div>
      ) : null}

      {loading && (
        <p className="font-mono text-xs text-ink-3">drafting a continuation in your voice…</p>
      )}

      {error && <p className="font-mono text-xs text-red-600">{error}</p>}

      {suggestion && (
        <div className="space-y-3">
          <div className="border border-rule bg-canvas p-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-3">
              proposed continuation
            </p>
            <p className="font-serif text-base leading-relaxed text-ink-2">
              {suggestion.continuation}
            </p>
          </div>

          {suggestion.flagged.length > 0 && (
            <ul className="space-y-1 font-mono text-[11px] text-amber-800">
              {suggestion.flagged.map((f, i) => (
                <li key={i}>
                  <span className="font-semibold">{f.kind.replace(/_/g, ' ')}:</span> &ldquo;{f.span}
                  &rdquo; — {f.note}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between font-mono text-xs">
            <span className="italic text-ink-3">{suggestion.reasoning}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reject}
                className="border border-rule bg-canvas px-3 py-1.5 text-ink-2 hover:text-ink"
              >
                reject
              </button>
              <button
                type="button"
                onClick={accept}
                className="border border-rule-strong bg-ink px-3 py-1.5 text-canvas hover:bg-ink-2"
              >
                accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
