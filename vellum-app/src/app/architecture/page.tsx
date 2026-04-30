import Link from 'next/link';

export const metadata = {
  title: 'Penstroke · architecture',
  description: 'How Penstroke is built. Apache AGE on Postgres, Yjs CRDT, two-tier model routing, eval-gated CI.',
};

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-canvas">
      <nav className="border-b border-rule px-5 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between">
          <Link href="/" className="font-mono text-sm tracking-wide text-ink hover:text-ink-2">
            penstroke
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3">
            architecture
          </span>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16 lg:py-24">
        <header className="mb-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">
            architecture, in one page
          </p>
          <h1 className="mb-6 font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            One Postgres, three layers, two tiers of inference.
          </h1>
        </header>

        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
            data model
          </h2>
          <p className="mb-4 font-serif text-lg leading-[1.6] text-ink">
            The prose document and the claim graph are two views of one transactional source of
            truth. The relational layer holds documents, revisions, sources, users, and orgs.
            Apache AGE 1.6.0 holds the graph: typed claim vertices and edges
            (<em>supports · contradicts · qualifies · depends_on</em>). pgvector 0.8.2 holds
            embeddings of bibliography passages as 1024-dim vectors with an HNSW index.
          </p>
          <p className="font-serif text-lg leading-[1.6] text-ink">
            All three layers are queryable in one SQL transaction. There is no cross-database
            sync to manage, no eventual consistency window, no separate vector or graph service
            to keep healthy.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
            inference
          </h2>
          <p className="mb-4 font-serif text-lg leading-[1.6] text-ink">
            Two tiers. <em>Haiku 4.5</em> handles the high-frequency, low-stakes work — running
            on every paragraph change to detect claims and classify them. Round trip to claim
            cards in the side-pane: ~200ms.
          </p>
          <p className="font-serif text-lg leading-[1.6] text-ink">
            <em>Sonnet 4.6</em> handles the low-frequency, high-stakes work — verification (with
            tool use over the bibliography and Exa web search), pairwise contradiction scanning,
            reconciliation drafting, the hostile-NYRB-critic, the reverse outline, and the
            voice-matched co-writer. Sonnet is invoked on demand or on save, never on every
            keystroke.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
            CRDT layer
          </h2>
          <p className="font-serif text-lg leading-[1.6] text-ink">
            Yjs handles concurrent edit merging. v1 runs in-memory only; the doc&rsquo;s prose is
            persisted as plaintext (<code>documents.proseText</code>) for search and the public
            viewer. v2 wires the WebSocket relay over Cloudflare Durable Objects for live
            multi-user collab.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
            eval gate
          </h2>
          <p className="font-serif text-lg leading-[1.6] text-ink">
            Every PR runs the Braintrust eval suite. The current gate is{' '}
            <em>type_match ≥ 0.85</em> on the claim-detector against a 30-paragraph
            hand-labeled gold set. Drops greater than 0.05 below baseline block merges. Last
            run: 86.36%. The harness, the dataset, and the scorers are checked in.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
            decision rationales
          </h2>
          <p className="font-serif text-lg leading-[1.6] text-ink">
            Every load-bearing technical choice — Azure over Neon, AGE over Neo4j, Drizzle over
            Prisma, Tiptap over Slate, Newsreader over Inter, Haiku-Sonnet routing over uniform
            inference — is logged with its tradeoff and revisit conditions in{' '}
            <a
              href="https://github.com/mariaangelikabuilds/vellum/blob/master/docs/decisions.md"
              className="text-ink underline-offset-4 hover:underline"
            >
              docs/decisions.md
            </a>
            .
          </p>
        </section>

        <footer className="border-t border-rule pt-8 font-mono text-xs text-ink-3">
          <p>
            For the literal end-to-end build steps, see{' '}
            <a
              href="https://github.com/mariaangelikabuilds/vellum/blob/master/BUILD.md"
              className="text-ink hover:underline"
            >
              BUILD.md
            </a>{' '}
            on the repo. Daily build log:{' '}
            <Link href="/build-log" className="text-ink hover:underline">
              /build-log
            </Link>
            .
          </p>
        </footer>
      </article>
    </main>
  );
}
