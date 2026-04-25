import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      <div className="max-w-md text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-3">
          404 · page not found
        </p>
        <h1 className="mb-6 font-serif text-4xl leading-tight text-ink">
          The page you&rsquo;re looking for has not been written.
        </h1>
        <p className="mb-8 font-serif text-base leading-relaxed text-ink-2">
          Maybe it&rsquo;s in a draft. Maybe its claim was contradicted and pulled. Maybe the URL
          carried a typo across paragraphs.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="border border-rule-strong bg-ink px-4 py-2 font-mono text-xs uppercase tracking-widest text-canvas hover:bg-ink-2"
          >
            home
          </Link>
          <Link
            href="/app"
            className="border border-rule-strong bg-canvas px-4 py-2 font-mono text-xs uppercase tracking-widest text-ink hover:bg-canvas-2"
          >
            open app
          </Link>
        </div>
      </div>
    </main>
  );
}
