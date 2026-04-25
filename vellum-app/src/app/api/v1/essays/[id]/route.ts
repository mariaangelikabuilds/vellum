import { NextResponse } from 'next/server';
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

/**
 * Public read-only essay endpoint. No auth required — only returns documents
 * marked `published: true`. The viewer at /v/[slug] uses this same data.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));

  if (!doc) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!doc.published) {
    return NextResponse.json({ error: 'not published' }, { status: 403 });
  }

  let authorEmail = '';
  if (doc.authorUserId) {
    const [author] = await db.select().from(users).where(eq(users.id, doc.authorUserId));
    authorEmail = author?.email ?? '';
  }

  const rawMarks = (await listClaimsForDocument(doc.id)) as unknown as AGRow[];
  const marks = rawMarks.map((r) => ({
    id: unquote(r.id),
    text: unquote(r.text),
    type: unquote(r.type),
    confidence: Number(r.confidence ?? 0),
  }));

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    proseText: doc.proseText ?? '',
    tags: doc.tags ?? [],
    author: authorEmail,
    publishedAt: doc.updatedAt,
    marks,
    counts: {
      marks: marks.length,
      contradictions: doc.contradictionCount ?? 0,
    },
  });
}
