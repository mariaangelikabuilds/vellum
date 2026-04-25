import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { suggestContinuation } from '@/ai/agents/cowriter';
import { syncCurrentUser } from '@/lib/auth/sync-user';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  const { id } = await params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (doc.orgId !== user.orgId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { paragraphs?: string[] };
  const paragraphs = Array.isArray(body.paragraphs)
    ? body.paragraphs.filter((p) => p.trim())
    : [];
  if (paragraphs.length === 0) {
    return NextResponse.json({ error: 'need at least one paragraph to continue from' }, { status: 400 });
  }

  const orgId = user.orgId ?? doc.orgId;
  const suggestion = await suggestContinuation({ paragraphs, orgId });
  return NextResponse.json(suggestion);
}
