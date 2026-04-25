'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { useEffect, useMemo } from 'react';
import { ClaimMark } from '@/editor/extensions/claim';
import { EvidenceMark } from '@/editor/extensions/evidence';
import { QuestionMark } from '@/editor/extensions/question';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface EditorProps {
  documentId: string;
  onClaimsDetected?: () => void;
}

export function Editor({ documentId, onClaimsDetected }: EditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), []);

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
          'prose-vellum max-w-none p-6 focus:outline-none font-sans text-base leading-relaxed min-h-[60vh]',
      },
    },
  });

  const debouncedDetect = useDebounce(async (paragraph: string) => {
    if (!paragraph || paragraph.length < 12) return;
    try {
      const r = await fetch('/api/detect-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph, documentId }),
      });
      if (r.ok && onClaimsDetected) onClaimsDetected();
    } catch {
      // network failure is non-fatal; user keeps typing
    }
  }, 800);

  useEffect(() => {
    if (!editor) return;
    const handler = ({ editor: e }: { editor: typeof editor }) => {
      if (!e) return;
      const { selection } = e.state;
      const $pos = selection.$from;
      const block = $pos.node($pos.depth);
      const text = block.textContent;
      debouncedDetect(text);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, debouncedDetect]);

  return <EditorContent editor={editor} />;
}
