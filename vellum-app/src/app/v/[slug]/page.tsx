import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents, users } from '@/db/schema';
import { listClaimsForDocument } from '@/db/graph';
import { SubscribeForm } from '@/components/v/SubscribeForm';

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
  if (!doc || !doc.published) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 font-serif text-lg text-ink-2">
        <p>essay not found, or not yet published.</p>
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
            penstroke
          </Link>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3">
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
            <span>verified by penstroke on {new Date(doc.updatedAt).toISOString().slice(0, 10)}</span>
            <span>·</span>
            <span>
              {claims.length} mark{claims.length === 1 ? '' : 's'}
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
          {doc.proseText ? (
            doc.proseText.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-6">
                {para}
              </p>
            ))
          ) : (
            <p className="mb-6 italic text-ink-3">
              this essay has no prose yet.
            </p>
          )}

          {(doc.tags ?? []).length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-1.5 font-mono text-xs">
              <span className="text-ink-3">tags:</span>
              {(doc.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="border border-rule bg-canvas-2 px-2 py-0.5 text-ink-2"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {claims.length > 0 && (
            <details className="mt-10 border border-rule-strong p-5 font-mono text-xs">
              <summary className="cursor-pointer uppercase tracking-widest text-ink-3 hover:text-ink">
                marks ({claims.length})
              </summary>
              <ul className="mt-4 space-y-2">
                {claims.map((c) => (
                  <li key={c.id} className="border-l-2 border-rule pl-3">
                    <span className="text-ink-3">
                      {c.type} · {c.confidence.toFixed(2)}
                    </span>
                    <p className="mt-0.5 font-serif text-base text-ink">{c.text}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="mt-16 border-t border-rule pt-8">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-3">
            subscribe to {authorEmail || 'this writer'}
          </p>
          <p className="mb-4 max-w-md font-serif text-sm text-ink-2">
            get the next essay by email when it&rsquo;s published — verified marks and all.
          </p>
          <SubscribeForm documentId={doc.id} />
        </section>

        <footer className="mt-16 border-t border-rule pt-8 font-mono text-xs text-ink-3">
          <p>
            this essay was written in{' '}
            <Link href="/" className="text-ink hover:underline">
              vellum
            </Link>
            . every mark above was extracted by an agent and{' '}
            {claims.length > 0 ? 'preserved with the prose' : 'is being verified'}. readers can
            challenge any mark — agent adjudication coming in v1.5.
          </p>
        </footer>
      </div>
    </article>
  );
}
