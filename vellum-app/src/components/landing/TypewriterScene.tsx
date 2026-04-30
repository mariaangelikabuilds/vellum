'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TypewriterMachine } from './TypewriterMachine';

/**
 * Hero scene for the landing page. Three coordinated parts:
 *   1. The typewriter mechanism — Lottie animation loaded from /typewriter.json
 *   2. The page being typed — character-by-character reveal with realistic rhythm
 *   3. The claim graph side-pane — cards slide in as Haiku "detects" claims
 */

type ClaimType = 'factual' | 'opinion' | 'speculation' | 'evidence' | 'question';

interface ClaimRange {
  start: number;
  end: number;
  type: ClaimType;
  confidence: number;
  label: string;
}

interface ContradictionMarker {
  triggerAt: number;
  fromLabel: string;
  toLabel: string;
}

const SCRIPT_TEXT = [
  'Most AI writing tools polish prose. ',
  'But Penstroke sees the structure of an argument. ',
  'Clearbrief raised $5M in 2024 to bring legal-grade citation tracking to writing software. ',
  'The gap is closing fast. ',
  'But maybe the gap is not closing at all — most tools still cannot reason across paragraphs. ',
  'Will eval-gated CI become standard by 2027?',
].join('');

const CLAIMS: ClaimRange[] = (() => {
  const find = (needle: string) => {
    const i = SCRIPT_TEXT.indexOf(needle);
    return { start: i, end: i + needle.length };
  };
  return [
    { ...find('AI writing tools polish prose'), type: 'factual', confidence: 0.78, label: 'AI tools polish prose' },
    { ...find('Penstroke sees the structure of an argument'), type: 'factual', confidence: 0.84, label: 'Penstroke sees argument structure' },
    { ...find('Clearbrief raised $5M in 2024'), type: 'factual', confidence: 0.91, label: 'Clearbrief raised $5M in 2024' },
    { ...find('The gap is closing fast'), type: 'opinion', confidence: 0.72, label: 'gap is closing fast' },
    { ...find('the gap is not closing at all'), type: 'opinion', confidence: 0.74, label: 'gap is not closing at all' },
    { ...find('Will eval-gated CI become standard by 2027'), type: 'question', confidence: 0.93, label: 'Will eval-gated CI become standard by 2027' },
  ];
})();

const CONTRADICTION: ContradictionMarker = {
  triggerAt: SCRIPT_TEXT.indexOf('the gap is not closing at all') + 30,
  fromLabel: 'gap is closing fast',
  toLabel: 'gap is not closing at all',
};

function delayFor(char: string): number {
  if (char === '.') return 380 + Math.random() * 220;
  if (char === '?' || char === '!') return 420 + Math.random() * 200;
  if (char === ',' || char === ';' || char === ':') return 220 + Math.random() * 160;
  if (char === ' ') return 70 + Math.random() * 60;
  if (char === '—' || char === '–') return 260 + Math.random() * 140;
  const base = 55 + Math.random() * 50;
  return Math.random() < 0.025 ? base + 280 + Math.random() * 320 : base;
}

export function TypewriterScene() {
  const [typedCount, setTypedCount] = useState(0);
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());
  const [contradictionVisible, setContradictionVisible] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function step(i: number) {
      if (cancelled) return;
      if (i > SCRIPT_TEXT.length) {
        restartTimeoutRef.current = setTimeout(() => {
          if (cancelled) return;
          setTypedCount(0);
          setRevealedCardIds(new Set());
          setContradictionVisible(false);
          setResetKey((k) => k + 1);
        }, 6500);
        return;
      }
      setTypedCount(i);

      const newClaim = CLAIMS.find((c) => c.end === i);
      if (newClaim) {
        const id = `${newClaim.start}-${newClaim.end}-${resetKey}`;
        setRevealedCardIds((prev) => new Set(prev).add(id));
      }

      if (i === CONTRADICTION.triggerAt) setContradictionVisible(true);

      const nextChar = SCRIPT_TEXT[i] ?? '';
      timeout = setTimeout(() => step(i + 1), delayFor(nextChar));
    }

    timeout = setTimeout(() => step(0), 800);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, [resetKey]);

  const renderedChars = useMemo(() => {
    const visible = SCRIPT_TEXT.slice(0, typedCount);
    return Array.from(visible).map((ch, idx) => {
      const claim = CLAIMS.find((c) => idx >= c.start && idx < c.end && idx < typedCount);
      const claimDone = claim && typedCount >= claim.end;
      return { ch, idx, claim, claimDone };
    });
  }, [typedCount]);

  const cards = useMemo(() => {
    return CLAIMS.filter((c) => revealedCardIds.has(`${c.start}-${c.end}-${resetKey}`));
  }, [revealedCardIds, resetKey]);

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-px border border-rule-strong bg-rule lg:grid-cols-[1fr_320px]">
        {/* paper column */}
        <div className="relative bg-canvas">
          <div className="border-b border-rule px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-ink-3">
            essay · penstroke
          </div>

          {contradictionVisible && (
            <div
              key={`ribbon-${resetKey}`}
              className="border-b border-amber-700/40 bg-amber-100 px-5 py-2.5 font-mono text-xs text-amber-900"
              style={{ animation: 'vellum-ribbon-in 320ms ease-out' }}
            >
              <strong className="font-semibold">contradiction · </strong>
              &ldquo;{CONTRADICTION.fromLabel}&rdquo; vs. &ldquo;{CONTRADICTION.toLabel}&rdquo;
              <span className="float-right cursor-pointer underline-offset-2 hover:underline">
                reconcile →
              </span>
            </div>
          )}

          <div className="px-7 py-8 font-serif text-lg leading-[1.75] text-ink min-h-[260px]">
            {renderedChars.map(({ ch, idx, claim, claimDone }) => (
              <span
                key={`${idx}-${resetKey}`}
                className={claim && claimDone ? `tw-claim tw-claim--${claim.type}` : undefined}
                style={{ animation: 'vellum-char-in 90ms ease-out both' }}
              >
                {ch}
              </span>
            ))}
            <span className="tw-caret" aria-hidden="true" />
          </div>

          {/* the typewriter machine sits below the paper, like the page is feeding out of it */}
          <div className="border-t border-rule bg-canvas-2 px-5 py-5">
            <TypewriterMachine lastChar={SCRIPT_TEXT[typedCount - 1] ?? ''} pressTick={typedCount} />
          </div>
        </div>

        {/* side pane */}
        <aside className="bg-canvas-2 px-4 py-5">
          <div className="mb-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-ink-3">
            <span>marks</span>
            <span>
              {cards.length} mark{cards.length === 1 ? '' : 's'}
            </span>
          </div>

          {cards.length === 0 ? (
            <p className="font-mono text-xs text-ink-3">listening…</p>
          ) : (
            <ul className="space-y-2">
              {cards.map((c) => (
                <li
                  key={`${c.start}-${c.end}-${resetKey}`}
                  className="border border-rule bg-canvas px-3 py-2"
                  style={{ animation: 'vellum-card-in 280ms ease-out both' }}
                >
                  <div className="font-mono text-xs uppercase tracking-widest text-ink-3">
                    {c.type} · {c.confidence.toFixed(2)}
                  </div>
                  <div className="mt-1 font-serif text-sm leading-snug text-ink">{c.label}</div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <style jsx>{`
        @keyframes vellum-char-in {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes vellum-card-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes vellum-ribbon-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes vellum-caret-blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        :global(.tw-caret) {
          display: inline-block;
          width: 0.55ch;
          height: 1.1em;
          margin-left: 1px;
          vertical-align: text-bottom;
          background: var(--ink);
          animation: vellum-caret-blink 900ms steps(1, end) infinite;
        }
        :global(.tw-claim) {
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 4px;
          text-decoration-color: var(--ink-3);
        }
        :global(.tw-claim--factual) {
          text-decoration-style: solid;
        }
        :global(.tw-claim--opinion) {
          text-decoration-style: dotted;
          font-style: italic;
        }
        :global(.tw-claim--speculation) {
          text-decoration-style: dashed;
        }
        :global(.tw-claim--evidence) {
          text-decoration-thickness: 2px;
          text-decoration-color: var(--ink);
        }
        :global(.tw-claim--question) {
          text-decoration-style: dashed;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
