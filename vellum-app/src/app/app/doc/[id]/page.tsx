import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { DocumentSurface } from './surface';

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) redirect('/app');

  return (
    <main className="flex h-screen flex-col bg-canvas">
      <header className="border-b border-rule px-6 py-3">
        <h1 className="font-mono text-sm text-ink-2">{doc.title}</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <DocumentSurface documentId={doc.id} />
      </div>
    </main>
  );
}
