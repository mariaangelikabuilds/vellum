'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface Result {
  id: string;
  title: string;
  tags: string[];
  snippet: string;
  updatedAt: string;
  claimCount: number;
}

export function SearchBar() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedSearch = useDebounce(async (query: string) => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (r.ok) {
        const data = (await r.json()) as { results: Result[] };
        setResults(data.results);
      }
    } finally {
      setLoading(false);
    }
  }, 250);

  useEffect(() => {
    debouncedSearch(q);
  }, [q, debouncedSearch]);

  return (
    <div className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="search title · prose · tags"
        className="w-full border border-rule bg-canvas px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-rule-strong focus:outline-none"
      />

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-96 overflow-y-auto border border-rule-strong bg-canvas">
          {loading ? (
            <p className="px-3 py-2 font-mono text-xs text-ink-3">searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 font-mono text-xs text-ink-3">no matches</p>
          ) : (
            <ul className="divide-y divide-rule">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/doc/${r.id}`}
                    className="block px-3 py-2 hover:bg-canvas-2"
                  >
                    <div className="font-mono text-xs text-ink">{r.title}</div>
                    {r.snippet && (
                      <div className="mt-0.5 line-clamp-2 font-serif text-xs leading-snug text-ink-2">
                        {r.snippet}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-ink-3">
                      {r.tags.map((t) => (
                        <span key={t} className="border border-rule bg-canvas-2 px-1.5">#{t}</span>
                      ))}
                      <span>{r.claimCount} marks</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
