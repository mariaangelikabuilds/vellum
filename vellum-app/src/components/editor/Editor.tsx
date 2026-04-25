'use client';

import { EditorContent, useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { useEffect, useMemo, useState } from 'react';
import { ClaimMark, type ClaimType } from '@/editor/extensions/claim';
import { EvidenceMark } from '@/editor/extensions/evidence';
import { QuestionMark } from '@/editor/extensions/question';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface DetectedClaim {
  text: string;
  type: ClaimType;
  confidence: number;
  position: [number, number];
}

interface EditorProps {
  documentId: string;
  /** plaintext content to seed the editor on mount (from the persisted proseText column) */
  initialContent?: string;
  onClaimsDetected?: () => void;
  /** fires on every character entry; used by the typewriter machine to depress keys */
  onKeystroke?: (char: string) => void;
  /** fires whenever paragraph content changes; used by SidePane tabs that operate on doc text */
  onParagraphsChange?: (paragraphs: string[]) => void;
}

/**
 * Find each detected claim's text in the editor doc and apply the `claim` mark.
 * Operates on a single transaction so cursor doesn't jump and undo history
 * stays clean. Idempotent — clears all existing claim marks before reapplying.
 */
function applyClaimMarks(editor: TiptapEditor, claims: DetectedClaim[]) {
  const { state, view } = editor;
  const markType = state.schema.marks.claim;
  if (!markType) return;

  let tr = state.tr.setMeta('addToHistory', false);

  // Clear existing claim marks across the whole doc.
  tr = tr.removeMark(0, state.doc.content.size, markType);

  // Apply new marks by searching each text node for each claim's text.
  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    for (const claim of claims) {
      const idx = text.indexOf(claim.text);
      if (idx >= 0) {
        const from = pos + idx;
        const to = from + claim.text.length;
        tr = tr.addMark(from, to, markType.create({ claimType: claim.type }));
      }
    }
  });

  view.dispatch(tr);
}

export function Editor({
  documentId,
  initialContent,
  onClaimsDetected,
  onKeystroke,
  onParagraphsChange,
}: EditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [detecting, setDetecting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      ClaimMark,
      EvidenceMark,
      QuestionMark,
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose-vellum max-w-none px-8 py-10 focus:outline-none font-serif text-lg leading-[1.7] min-h-[60vh]',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'off',
      },
    },
  });

  const debouncedDetectAll = useDebounce(async (paragraphs: string[]) => {
    const filtered = paragraphs.filter((p) => p.length >= 12);
    if (filtered.length === 0) return;
    setDetecting(true);
    try {
      const r = await fetch('/api/detect-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphs: filtered, documentId, replace: true }),
      });
      if (r.ok) {
        const { claims } = (await r.json()) as { claims: DetectedClaim[] };
        if (editor) applyClaimMarks(editor, claims);
        if (onClaimsDetected) onClaimsDetected();
      }
    } catch {
      // network failure is non-fatal; user keeps typing
    } finally {
      setDetecting(false);
    }
  }, 1200);

  // seed initial content once when the editor is ready and there's something to seed
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!editor || seeded) return;
    if (initialContent && initialContent.trim()) {
      const html = initialContent
        .split(/\n\n+/)
        .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('');
      editor.commands.setContent(html, { emitUpdate: false });
    }
    setSeeded(true);
  }, [editor, initialContent, seeded]);

  useEffect(() => {
    if (!editor) return;
    const handler = ({ editor: e }: { editor: typeof editor }) => {
      if (!e) return;

      // fire onKeystroke with the character just behind the cursor.
      // crude but good enough for the typewriter visual: paste / large
      // insertions still trigger one key-press of the last char, deletes
      // give an empty char that the machine ignores.
      if (onKeystroke) {
        const { selection } = e.state;
        const $from = selection.$from;
        if ($from.parentOffset > 0) {
          const text = $from.parent.textContent;
          const ch = text[$from.parentOffset - 1] ?? '';
          if (ch) onKeystroke(ch);
        }
      }

      const paragraphs: string[] = [];
      e.state.doc.forEach((node) => {
        if (node.isTextblock && node.textContent.trim()) {
          paragraphs.push(node.textContent);
        }
      });
      if (onParagraphsChange) onParagraphsChange(paragraphs);
      debouncedDetectAll(paragraphs);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, debouncedDetectAll]);

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      {detecting && (
        <span className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-widest text-ink-3">
          detecting…
        </span>
      )}
    </div>
  );
}
