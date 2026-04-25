import Link from 'next/link';

export const metadata = {
  title: 'Vellum · build log',
  description: 'Daily-ish build notes — what shipped, what was hard, what Claude Code helped with.',
};

interface Entry {
  date: string;
  phase: string;
  topic: string;
  body: string[];
}

const ENTRIES: Entry[] = [
  {
    date: '2026-04-25',
    phase: 'Day 1',
    topic: 'Sections 1-9 functional in one focused build session',
    body: [
      'Starting from the scaffolded hero repo, ran through the entire BUILD.md spine in a single session. Toolchain verification, 13 service accounts (Anthropic, Clerk, Stripe, Voyage, Exa, Trigger.dev, Resend, Sentry, Langfuse, Braintrust, GitHub, Cloudflare, plus the original Neon → Azure pivot mid-Section-3 when Neon turned out not to support Apache AGE).',
      'Sections shipped: prerequisites, Next.js 16 + Tailwind 4 + shadcn scaffold, Postgres + AGE + pgvector + 7-table Drizzle schema + AGE graph helpers + seed, Clerk auth + proxy.ts, agent fleet (claim-detector, verifier, gap-detector, contradiction-finder, reconciler, critic, outline, cowriter, AI-detector, synonyms, explainer), Tiptap editor with custom marks + selection bubble menu + cowriter dock + typewriter scene, Braintrust eval harness with 30-entry gold set, Sentry source maps wired, Vercel config and DEPLOY.md script.',
      'Caught and worked around 16 BUILD.md staleness items along the way — Tiptap v3 collaboration-cursor renamed to caret, @trigger.dev/nextjs deprecated, AGE LOAD restricted to superusers on Azure (use shared_preload_libraries instead), AGE cypher() needs a SQL literal not a parameter, drizzle-kit push needs a TTY, etc. Each is logged in the relevant commit.',
      'Eval scores after expanding gold set 12 → 30: claim_count_match 100%, type_match 86.36% (crosses BUILD.md target ≥ 0.85), confidence_above_min 77.27%. Verifier smoke-tested end-to-end: Sonnet found a bibliography row via pgvector cosine search, used Exa web search to surface ContraDoc + Novarrium, marked a claim SUPPORTED at 0.81-0.85, identified a category-error tension between two seed claims.',
      'Claude Code division of labor held: every architectural choice was author-side (Neon → Azure pivot, no-AI design register, Newsreader + Libre Franklin pairing, two-tier model routing). Drizzle table writeups, route handlers, agent scaffolding, and most of the SVG typewriter were delegated.',
    ],
  },
  {
    date: '2026-04-26',
    phase: 'Day 2',
    topic: 'Polish + audience widening',
    body: [
      'Mobile responsive pass across landing, sign-in/up, and editor (with a "best on desktop" notice rather than pretending the editor works on phones). Newsletter publishing wired via Resend — subscribers table, anonymous /api/v1/essays/[id]/subscribe, broadcast endpoint that sends one Resend batch to all subscribers.',
      'Three selection-driven craft tools added: context-aware synonyms, phrase explainer, and AI-detection check. The detection tool inverts AI-watermarking: instead of flagging whether someone used AI, it helps writers verify their own voice still reads as theirs. The synonym tool reads the surrounding sentence and returns alternatives with connotation notes — not a generic thesaurus. The explainer reflects a writer\u2019s phrase back at them in plain reading + unpacked assumptions.',
      'Typography revised twice in one day. First pass: drop Geist Sans, alias mono to Geist Mono. Second pass: drop Geist Mono visually too, alias both to Newsreader serif. Third pass: introduce Libre Franklin (open-source Franklin Gothic) for chrome — labels, tabs, footer, nav. Final state is the NYT pairing pattern: Newsreader serif body + Libre Franklin sans-grotesque chrome. Architecture-list lead-ins (\u201cYjs CRDT + custom Tiptap/ProseMirror schema\u201d, etc.) styled as serif italic, like proper editorial usage of technical names.',
      'Reorganized the editor canvas: scroll lives inside the writing surface only; cowriter bar and typewriter machine are pinned to the viewport bottom. The page fits the browser exactly at any prose length. Voice-check button moved into the document chrome row alongside publish + broadcast (was its own toolbar, read as clutter).',
      'README rewrote with eval scores table, architecture diagram (SVG), what\u2019s-intentionally-not-in-v1 section, status checklist filled. Decision log written: 12 load-bearing choices with tradeoffs and revisit conditions. /architecture and /build-log routes added so the footer links resolve. Custom 404 page added.',
    ],
  },
];

export default function BuildLogPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <nav className="border-b border-rule px-5 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between">
          <Link href="/" className="font-mono text-sm tracking-wide text-ink hover:text-ink-2">
            vellum
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3">
            build log
          </span>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16 lg:py-24">
        <header className="mb-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">
            build log · daily-ish
          </p>
          <h1 className="mb-6 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            What shipped, what was hard, what Claude Code helped with.
          </h1>
          <p className="max-w-2xl font-serif text-lg leading-[1.55] text-ink-2">
            Capturing as I go, not at the end. The discipline is to write the entry the same day
            the work happens — by retrospective time, the texture has already faded.
          </p>
        </header>

        <ol className="space-y-12">
          {ENTRIES.map((e) => (
            <li key={e.date} className="border-l-2 border-rule pl-6">
              <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-widest text-ink-3">
                <time>{e.date}</time>
                <span>·</span>
                <span>{e.phase}</span>
              </header>
              <h2 className="mb-4 font-serif text-2xl leading-snug text-ink">{e.topic}</h2>
              <div className="space-y-3 font-serif text-lg leading-[1.6] text-ink">
                {e.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <footer className="mt-16 border-t border-rule pt-8 font-mono text-xs text-ink-3">
          <p>
            Source on{' '}
            <a
              href="https://github.com/mariaangelikabuilds/vellum"
              className="text-ink hover:underline"
            >
              GitHub
            </a>
            . Architecture writeup at{' '}
            <Link href="/architecture" className="text-ink hover:underline">
              /architecture
            </Link>
            . Decision rationales at{' '}
            <a
              href="https://github.com/mariaangelikabuilds/vellum/blob/master/docs/decisions.md"
              className="text-ink hover:underline"
            >
              docs/decisions.md
            </a>
            .
          </p>
        </footer>
      </article>
    </main>
  );
}
