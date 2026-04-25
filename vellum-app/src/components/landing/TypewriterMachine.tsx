'use client';

import { useEffect, useState } from 'react';

/**
 * Schematic vintage typewriter in pure SVG. Editorial line-drawing register —
 * no fills, no gradients, just hairline strokes in --ink on --canvas.
 * Keys depress in sync with whatever character is currently being typed
 * (controlled via the `lastChar` prop the parent updates on each keystroke).
 */

const KEY_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const KEY_RADIUS = 11;
const KEY_GAP = 6;
const ROW_GAP = 9;

// row 0 starts at this x; subsequent rows are indented (typewriter staircase)
const ROW_X_OFFSET = [0, 14, 28];

interface Props {
  /** the most recent character typed in the connected editor; '' = nothing yet */
  lastChar: string;
  /** monotonically increasing tick — bump this to retrigger the press anim
      even when lastChar repeats (e.g. "ll" in "hello") */
  pressTick: number;
}

export function TypewriterMachine({ lastChar, pressTick }: Props) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const upper = lastChar.toUpperCase();
    if (!upper) return;

    if (upper === ' ') {
      setActiveKeys(new Set(['SPACE']));
    } else if (KEY_ROWS.flat().includes(upper)) {
      setActiveKeys(new Set([upper]));
    } else {
      // punctuation / non-mapped: light a random key briefly so the machine still moves
      const all = KEY_ROWS.flat();
      const random = all[Math.floor(Math.random() * all.length)];
      if (random) setActiveKeys(new Set([random]));
    }

    const timer = setTimeout(() => setActiveKeys(new Set()), 110);
    return () => clearTimeout(timer);
  }, [lastChar, pressTick]);

  // compute layout dims
  const rowWidths = KEY_ROWS.map(
    (row, i) => (row.length * (KEY_RADIUS * 2 + KEY_GAP)) - KEY_GAP + (ROW_X_OFFSET[i] ?? 0),
  );
  const maxRowWidth = Math.max(...rowWidths);
  const keyboardHeight = KEY_ROWS.length * (KEY_RADIUS * 2 + ROW_GAP) - ROW_GAP;
  const spacebarY = keyboardHeight + ROW_GAP + 4;
  const spacebarHeight = 12;
  const spacebarWidth = maxRowWidth - 30;

  // overall SVG viewport
  const padding = 22;
  const carriageHeight = 30;
  const carriageGap = 18;
  const totalHeight = padding + carriageHeight + carriageGap + spacebarY + spacebarHeight + padding;
  const totalWidth = maxRowWidth + padding * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      height={totalHeight}
      style={{ maxWidth: 540, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="Schematic typewriter"
    >
      {/* paper sheet rising out of the carriage */}
      <g transform={`translate(${padding + (maxRowWidth - 200) / 2}, ${padding - 10})`}>
        <rect
          x={0}
          y={-30}
          width={200}
          height={48}
          fill="var(--canvas)"
          stroke="var(--ink)"
          strokeWidth={1}
        />
        {/* faint horizontal text-lines on the paper */}
        {[0, 1, 2].map((i) => (
          <line
            key={`pl-${i}`}
            x1={10}
            x2={190}
            y1={-22 + i * 8}
            y2={-22 + i * 8}
            stroke="var(--ink-3)"
            strokeWidth={0.6}
          />
        ))}
      </g>

      {/* carriage — horizontal bar with two end knobs */}
      <g transform={`translate(${padding}, ${padding})`}>
        <line
          x1={0}
          y1={carriageHeight / 2}
          x2={maxRowWidth}
          y2={carriageHeight / 2}
          stroke="var(--ink)"
          strokeWidth={1.2}
        />
        <rect
          x={0}
          y={4}
          width={maxRowWidth}
          height={carriageHeight - 8}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1}
        />
        {/* knobs */}
        <circle cx={-6} cy={carriageHeight / 2} r={6} fill="var(--canvas)" stroke="var(--ink)" strokeWidth={1} />
        <circle cx={maxRowWidth + 6} cy={carriageHeight / 2} r={6} fill="var(--canvas)" stroke="var(--ink)" strokeWidth={1} />
        {/* ribbon spools */}
        <circle
          cx={maxRowWidth * 0.32}
          cy={carriageHeight + 6}
          r={4.5}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1}
        />
        <circle
          cx={maxRowWidth * 0.68}
          cy={carriageHeight + 6}
          r={4.5}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1}
        />
      </g>

      {/* keys */}
      <g transform={`translate(${padding}, ${padding + carriageHeight + carriageGap})`}>
        {KEY_ROWS.map((row, rowIdx) => {
          const rowX = ROW_X_OFFSET[rowIdx] ?? 0;
          const rowY = rowIdx * (KEY_RADIUS * 2 + ROW_GAP) + KEY_RADIUS;
          return row.map((letter, colIdx) => {
            const cx = rowX + colIdx * (KEY_RADIUS * 2 + KEY_GAP) + KEY_RADIUS;
            const isActive = activeKeys.has(letter);
            return (
              <g
                key={`${letter}-${rowIdx}-${colIdx}`}
                transform={`translate(${cx}, ${rowY + (isActive ? 1.5 : 0)})`}
                style={{ transition: 'transform 60ms ease-out' }}
              >
                <circle
                  r={KEY_RADIUS}
                  fill={isActive ? 'var(--ink)' : 'var(--canvas)'}
                  stroke="var(--ink)"
                  strokeWidth={1}
                  style={{ transition: 'fill 80ms ease-out' }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={9}
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fill={isActive ? 'var(--canvas)' : 'var(--ink)'}
                  style={{ transition: 'fill 80ms ease-out' }}
                >
                  {letter}
                </text>
              </g>
            );
          });
        })}

        {/* spacebar */}
        {(() => {
          const isActive = activeKeys.has('SPACE');
          return (
            <g transform={`translate(${(maxRowWidth - spacebarWidth) / 2}, ${spacebarY + (isActive ? 1.5 : 0)})`} style={{ transition: 'transform 60ms ease-out' }}>
              <rect
                x={0}
                y={0}
                width={spacebarWidth}
                height={spacebarHeight}
                rx={spacebarHeight / 2}
                ry={spacebarHeight / 2}
                fill={isActive ? 'var(--ink)' : 'var(--canvas)'}
                stroke="var(--ink)"
                strokeWidth={1}
                style={{ transition: 'fill 80ms ease-out' }}
              />
            </g>
          );
        })()}
      </g>
    </svg>
  );
}
