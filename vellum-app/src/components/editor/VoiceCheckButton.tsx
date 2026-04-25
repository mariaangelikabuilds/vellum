'use client';

import { useState } from 'react';

interface AiCheckResult {
  score: number;
  verdict: 'human' | 'mixed' | 'likely_ai';
  reasoning: string;
  tells: string[];
}

const VERDICT_LABEL: Record<AiCheckResult['verdict'], string> = {
  human: 'reads human',
  mixed: 'mixed signal',
  likely_ai: 'reads AI',
};

const VERDICT_BG: Record<AiCheckResult['verdict'], string> = {
  human: 'border-rule-strong bg-canvas text-ink',
  mixed: 'border-amber-500 bg-amber-50 text-amber-900',
  likely_ai: 'border-amber-700 bg-amber-100 text-amber-900',
};

export function VoiceCheckButton({
  paragraphs,
}: {
  paragraphs: string[];
}) {
  const [result, setResult] = useState<AiCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const text = paragraphs.join('\n\n').trim();
  const enoughText = text.length >= 200;

  const run = async () => {
    if (!enoughText) {
      setError('write at least ~200 characters first');
      setOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/text/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (r.ok) {
        setResult((await r.json()) as AiCheckResult);
        setOpen(true);
      } else {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `${r.status}`);
        setOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={open ? () => setOpen(false) : run}
        disabled={loading}
        className={`border px-2 py-1 font-mono text-xs uppercase tracking-widest disabled:opacity-50 ${
          result
            ? VERDICT_BG[result.verdict]
            : 'border-rule bg-canvas text-ink-2 hover:text-ink'
        }`}
      >
        {loading
          ? 'reading…'
          : result
          ? VERDICT_LABEL[result.verdict]
          : 'voice check'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-80 border border-rule-strong bg-canvas p-4 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
              voice audit
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-xs text-ink-2 hover:text-ink"
            >
              close
            </button>
          </div>

          {error && <p className="font-mono text-xs text-red-600">{error}</p>}

          {result && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-xl text-ink">
                  {VERDICT_LABEL[result.verdict]}
                </span>
                <span className="font-mono text-xs text-ink-3">
                  · {(result.score * 100).toFixed(0)}% AI-ish
                </span>
              </div>

              <p className="font-serif text-sm italic leading-snug text-ink-2">
                {result.reasoning}
              </p>

              {result.tells.length > 0 && (
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-3">
                    tells
                  </p>
                  <ul className="space-y-0.5 font-serif text-xs leading-snug text-ink-2">
                    {result.tells.map((t, i) => (
                      <li key={i}>· {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
