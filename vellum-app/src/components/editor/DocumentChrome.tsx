'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { VoiceCheckButton } from './VoiceCheckButton';

interface Props {
  documentId: string;
  initialTitle: string;
  initialTags: string[];
  initialPublished: boolean;
  /** live paragraphs from the editor; used by the voice-check button */
  paragraphs: string[];
  mode: 'researcher' | 'freeform';
  onModeChange: (mode: 'researcher' | 'freeform') => void;
}

export function DocumentChrome({
  documentId,
  initialTitle,
  initialTags,
  initialPublished,
  paragraphs,
  mode,
  onModeChange,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagDraft, setTagDraft] = useState('');
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);

  const debouncedSave = useDebounce(async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } finally {
      setSaving(false);
    }
  }, 600);

  useEffect(() => {
    if (title !== initialTitle) debouncedSave({ title });
  }, [title, debouncedSave, initialTitle]);

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagDraft('');
    debouncedSave({ tags: next });
  };

  const removeTag = (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    debouncedSave({ tags: next });
  };

  const togglePublish = async () => {
    const next = !published;
    setPublished(next);
    setSaving(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: next }),
      });
    } finally {
      setSaving(false);
    }
  };

  const [broadcastState, setBroadcastState] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [broadcastInfo, setBroadcastInfo] = useState<string>('');

  const broadcast = async () => {
    if (broadcastState === 'sending') return;
    setBroadcastState('sending');
    setBroadcastInfo('');
    try {
      const r = await fetch(`/api/documents/${documentId}/broadcast`, { method: 'POST' });
      const body = (await r.json().catch(() => ({}))) as {
        sent?: number;
        error?: string;
      };
      if (r.ok) {
        setBroadcastState('sent');
        setBroadcastInfo(`sent to ${body.sent ?? 0}`);
      } else {
        setBroadcastState('error');
        setBroadcastInfo(body.error ?? `${r.status}`);
      }
    } catch (e) {
      setBroadcastState('error');
      setBroadcastInfo(e instanceof Error ? e.message : 'failed');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule px-6 py-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled — click to rename"
        aria-label="document title"
        className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 py-0.5 font-serif text-lg text-ink placeholder:italic placeholder:text-ink-3 hover:border-rule focus:border-rule-strong focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => removeTag(t)}
            className="border border-rule bg-canvas-2 px-2 py-0.5 font-mono text-xs text-ink-2 hover:border-rule-strong hover:text-ink"
            title="remove tag"
          >
            #{t} ×
          </button>
        ))}
        <input
          type="text"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="+ tag"
          className="w-20 border border-transparent bg-transparent px-1 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-rule focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest">
        <div className="inline-flex border border-rule bg-canvas-2">
          <button
            type="button"
            onClick={() => onModeChange('researcher')}
            className={`px-2.5 py-1 ${
              mode === 'researcher'
                ? 'bg-ink text-canvas'
                : 'text-ink-3 hover:text-ink'
            }`}
            title="claim/evidence/contradiction detection"
          >
            researcher
          </button>
          <button
            type="button"
            onClick={() => onModeChange('freeform')}
            className={`border-l border-rule px-2.5 py-1 ${
              mode === 'freeform'
                ? 'bg-ink text-canvas'
                : 'text-ink-3 hover:text-ink'
            }`}
            title="intent-coherence detection"
          >
            freeform
          </button>
        </div>
        {saving && <span className="text-ink-3">saving…</span>}
        {mode === 'researcher' && <VoiceCheckButton paragraphs={paragraphs} />}
        <button
          type="button"
          onClick={togglePublish}
          className={`border px-2 py-1 ${
            published
              ? 'border-rule-strong bg-ink text-canvas hover:bg-ink-2'
              : 'border-rule bg-canvas text-ink-2 hover:text-ink'
          }`}
        >
          {published ? 'published' : 'publish'}
        </button>
        {published && (
          <>
            <a
              href={`/v/${documentId}`}
              target="_blank"
              rel="noreferrer"
              className="text-ink-2 hover:text-ink"
            >
              view →
            </a>
            <button
              type="button"
              onClick={broadcast}
              disabled={broadcastState === 'sending' || broadcastState === 'sent'}
              className="border border-rule bg-canvas px-2 py-1 text-ink-2 hover:text-ink disabled:opacity-50"
            >
              {broadcastState === 'sending'
                ? 'broadcasting…'
                : broadcastState === 'sent'
                ? `sent ${broadcastInfo ? `(${broadcastInfo})` : ''}`
                : broadcastState === 'error'
                ? `error: ${broadcastInfo}`
                : 'broadcast'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
