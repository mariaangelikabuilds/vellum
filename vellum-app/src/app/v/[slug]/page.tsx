import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents, users } from '@/db/schema';
import { listClaimsForDocument } from '@/db/graph';

interface AGRow {
  id: unknown;
  text: unknown;
  type: unknown;
  confidence: unknown;
}

function unquote(v: unknown): string {
  return String(v ?? '').replace(/^"|"$/g, '');
}

export default async function PublicViewer({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // For v1, the slug IS the document UUID. v2 adds dedicated slugs.
  const [doc] = await db.select().from(documents).where(eq(documents.id, slug));
  if (!doc) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 font-serif text-lg text-ink-2">
        <p>essay not found.</p>
      </main>
    );
  }

  let authorEmail = '';
  if (doc.authorUserId) {
    const [author] = await db.select().from(users).where(eq(users.id, doc.authorUserId));
    authorEmail = author?.email ?? '';
  }

  const claimsRaw = (await listClaimsForDocument(doc.id)) as unknown as AGRow[];
  const claims = claimsRaw.map((r) => ({
    id: unquote(r.id),
    text: unquote(r.text),
    type: unquote(r.type),
    confidence: Number(r.confidence ?? 0),
  }));

  return (
    <article className="min-h-screen bg-canvas">
      <nav className="border-b border-rule px-5 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between">
          <Link href="/" className="font-mono text-sm tracking-wide text-ink hover:text-ink-2">
            vellum
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
            verified essay
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16 lg:py-24">
        <header className="mb-10 border-b border-rule pb-8">
          <h1 className="mb-4 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
            {doc.title}
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-xs text-ink-3">
            {authorEmail && <span>by {authorEmail}</span>}
            <span>·</span>
            <span>verified by vellum on {new Date(doc.updatedAt).toISOString().slice(0, 10)}</span>
            <span>·</span>
            <span>
              {claims.length} claim{claims.length === 1 ? '' : 's'}
            </span>
            {doc.contradictionCount && doc.contradictionCount > 0 ? (
              <>
                <span>·</span>
                <span className="text-amber-700">
                  {doc.contradictionCount} contradiction
                  {doc.contradictionCount === 1 ? '' : 's'}
                </span>
              </>
            ) : null}
          </div>
        </header>

        <section className="font-serif text-lg leading-[1.7] text-ink">
          <p className="mb-6 italic text-ink-2">
            (Public reader view scaffolded for v1 — the actual prose rendering will hydrate from
            the saved Yjs state once persistence ships in v1.5.)
          </p>

          {claims.length > 0 && (
            <div className="border border-rule-strong p-5 font-mono text-xs">
              <p className="mb-3 uppercase tracking-widest text-ink-3">claim graph</p>
              <ul className="space-y-2">
                {claims.map((c) => (
                  <li key={c.id} className="border-l-2 border-rule pl-3">
                    <span className="text-ink-3">
                      {c.type} · {c.confidence.toFixed(2)}
                    </span>
                    <p className="mt-0.5 font-serif text-base text-ink">{c.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <footer className="mt-16 border-t border-rule pt-8 font-mono text-[11px] text-ink-3">
          <p>
            this essay was written in{' '}
            <Link href="/" className="text-ink hover:underline">
              vellum
            </Link>
            . every claim above was extracted by an agent and{' '}
            {claims.length > 0 ? 'preserved with the prose' : 'is being verified'}. readers can
            challenge any claim — agent adjudication coming in v1.5.
          </p>
        </footer>
      </div>
    </article>
  );
}
