import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { TypewriterScene } from '@/components/landing/TypewriterScene';

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <nav className="flex items-center justify-between border-b border-rule px-5 py-4 sm:px-8 sm:py-5">
        <span className="font-mono text-sm tracking-wide">vellum</span>
        <div className="flex items-center gap-3 font-mono text-xs text-ink-2 sm:gap-6">
          <Link href="/architecture" className="hidden hover:text-ink sm:inline">
            architecture
          </Link>
          <a
            href="https://github.com/mariaangelikabuilds/vellum"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            github
          </a>
          {userId ? (
            <Link
              href="/app"
              className="border border-rule-strong bg-ink px-3 py-1 text-canvas hover:bg-ink-2"
            >
              open app
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="border border-rule-strong bg-ink px-3 py-1 text-canvas hover:bg-ink-2"
            >
              start writing
            </Link>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16 lg:py-24">
        <header className="mb-10 lg:mb-16">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">
            graph-of-claims word processor
          </p>
          <h1 className="mb-6 font-serif text-[2rem] leading-[1.1] tracking-[-0.015em] sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
            Most AI writing tools polish prose.
            <br />
            <em className="not-italic text-ink-2">Vellum sees the structure of an argument.</em>
          </h1>
          <p className="max-w-2xl font-serif text-base leading-[1.55] text-ink-2 sm:text-lg lg:text-xl">
            As you write, Vellum marks every load-bearing sentence as a node in a typed graph.
            Every citation becomes an edge. A background agent fleet checks each mark against your
            bibliography and the open web, flagging unsupported assertions, contradictions across
            paragraphs, and missing premises before you ship.
          </p>
        </header>

        <section className="mb-20">
          <TypewriterScene />
          <p className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-ink-3">
            live · vellum is doing this right now
          </p>
        </section>

        <section className="mb-16 grid grid-cols-1 gap-px border border-rule-strong bg-rule md:grid-cols-3">
          <Card title="Detect" lede="Haiku 4.5 classifies every claim as factual, opinion, speculation, evidence, or question. ~200ms per paragraph.">
            $0.001 / paragraph
          </Card>
          <Card title="Verify" lede="Sonnet 4.6 with tool use searches your bibliography (pgvector) and the open web (Exa) to ground every claim. Background, non-blocking.">
            $0.01-0.02 / claim
          </Card>
          <Card title="Reconcile" lede="When two claims contradict, an agent drafts the fix. The graph updates. The warning clears.">
            yellow ribbon, click to fix
          </Card>
        </section>

        <section className="mb-16">
          <h2 className="mb-6 font-mono text-xs uppercase tracking-widest text-ink-3">
            architecture, briefly
          </h2>
          <ul className="space-y-4 font-serif text-lg leading-[1.55] text-ink">
            <li>
              <span className="font-mono text-ink-2">Yjs CRDT + custom Tiptap/ProseMirror schema</span>
              {' '}— prose document and claim graph stay in sync via a deterministic projection
              function. Mergeable both directions.
            </li>
            <li>
              <span className="font-mono text-ink-2">Apache AGE on Postgres</span>
              {' '}— graph traversals, relational queries, and pgvector retrieval in one database.
              Single transactional consistency boundary.
            </li>
            <li>
              <span className="font-mono text-ink-2">Two-tier model routing</span>
              {' '}— Haiku for sub-200ms claim-detection (high frequency), Sonnet for high-stakes
              verification with tool use (low frequency). Cost-disciplined.
            </li>
            <li>
              <span className="font-mono text-ink-2">Eval-gated deploys</span>
              {' '}— Braintrust runs nightly regression tests on claim-detection and
              contradiction-detection. CI blocks deploys that drop &gt;0.05 below baseline.
            </li>
            <li>
              <span className="font-mono text-ink-2">Background verification via Trigger.dev</span>
              {' '}— verification doesn&apos;t block the request path; UI streams updates as agents
              finish.
            </li>
          </ul>
        </section>

        <footer className="border-t border-rule pt-8 font-mono text-xs text-ink-3">
          <p>
            built solo with Claude Code as pair-programmer.{' '}
            <a
              href="https://github.com/mariaangelikabuilds/vellum"
              className="text-ink hover:underline"
            >
              source on github
            </a>
            {' '}· build log{' '}
            <Link href="/build-log" className="text-ink hover:underline">
              here
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}

function Card({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <article className="bg-canvas p-6">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">{title}</h3>
      <p className="mb-4 font-serif text-base leading-[1.55] text-ink">{lede}</p>
      <p className="font-mono text-xs text-ink-2">{children}</p>
    </article>
  );
}
