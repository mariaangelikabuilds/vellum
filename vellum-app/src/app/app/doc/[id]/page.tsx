import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { DocumentSurface } from './surface';
import { DocumentChrome } from '@/components/editor/DocumentChrome';

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
      <DocumentChrome
        documentId={doc.id}
        initialTitle={doc.title}
        initialTags={doc.tags ?? []}
        initialPublished={doc.published ?? false}
      />
      <div className="flex-1 overflow-hidden">
        <DocumentSurface documentId={doc.id} initialProseText={doc.proseText ?? ''} />
      </div>
    </main>
  );
}
