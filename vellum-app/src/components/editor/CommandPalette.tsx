'use client';

import { useEffect, useRef, useState } from 'react';

interface Command {
  id: string;
  label: string;
  hint: string;
  action: () => void;
  /** keyboard shortcut hint shown in the right column */
  shortcut?: string;
}

interface Props {
  /** doc-level handlers from the surface */
  onRunCritic: () => void;
  onRunOutline: () => void;
  onScanContradictions: () => void;
  onRunVoiceCheck: () => void;
  onContinueWriting: () => void;
  onTogglePublish: () => void;
  onCopyShareUrl: () => void;
}

export function CommandPalette({
  onRunCritic,
  onRunOutline,
  onScanContradictions,
  onRunVoiceCheck,
  onContinueWriting,
  onTogglePublish,
  onCopyShareUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: 'critic',
      label: 'run critic',
      hint: 'sonnet reviews like a hostile NYRB editor',
      action: onRunCritic,
    },
    {
      id: 'outline',
      label: 'reverse outline',
      hint: 'extract bullet structure of what you wrote',
      action: onRunOutline,
    },
    {
      id: 'scan',
      label: 'scan for contradictions',
      hint: 'pairwise sweep across all marks',
      action: onScanContradictions,
    },
    {
      id: 'voice',
      label: 'voice check',
      hint: 'does this still read as you?',
      action: onRunVoiceCheck,
    },
    {
      id: 'continue',
      label: 'continue writing',
      hint: 'sonnet drafts the next paragraph in your voice',
      action: onContinueWriting,
    },
    {
      id: 'publish',
      label: 'toggle publish',
      hint: 'flip /v/[id] visibility on or off',
      action: onTogglePublish,
    },
    {
      id: 'share',
      label: 'copy share URL',
      hint: 'paste the public viewer link',
      action: onCopyShareUrl,
    },
  ];

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const filtered = commands.filter(
    (c) =>
      query.trim() === '' ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.hint.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl border border-rule-strong bg-canvas shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="run a command…"
          className="w-full border-b border-rule bg-transparent px-4 py-3 font-serif text-base text-ink placeholder:italic placeholder:text-ink-3 focus:outline-none"
        />

        {filtered.length === 0 ? (
          <p className="px-4 py-3 font-serif text-sm italic text-ink-3">no commands match</p>
        ) : (
          <ul className="max-h-[50vh] overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    c.action();
                  }}
                  className="block w-full px-4 py-3 text-left hover:bg-canvas-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-base text-ink">{c.label}</span>
                    {c.shortcut && (
                      <span className="font-mono text-xs text-ink-3">{c.shortcut}</span>
                    )}
                  </div>
                  <p className="mt-0.5 font-serif text-sm italic text-ink-2">{c.hint}</p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="flex items-center justify-between border-t border-rule px-4 py-2 font-mono text-xs text-ink-3">
          <span>↑↓ navigate · ⏎ run · esc close</span>
          <span>⌘K to toggle</span>
        </footer>
      </div>
    </div>
  );
}
