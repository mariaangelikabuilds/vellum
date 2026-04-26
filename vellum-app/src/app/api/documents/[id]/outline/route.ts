import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { reverseOutline } from '@/ai/agents/reverse-outline';
import { syncCurrentUser } from '@/lib/auth/sync-user';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Outline runs Sonnet over the doc — ~$0.03/call. Hourly cap.
  const limit = rateLimit(`outline:${userId}`, { tokens: 20, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate limited — try again later' }, { status: 429 });
  }

  const user = await syncCurrentUser();
  const { id } = await params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (doc.orgId !== user.orgId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { paragraphs?: string[] };
  const paragraphs = Array.isArray(body.paragraphs) ? body.paragraphs : [];
  if (paragraphs.length === 0) {
    return NextResponse.json({ error: 'no paragraphs' }, { status: 400 });
  }

  const orgId = user.orgId ?? doc.orgId;
  const outline = await reverseOutline(paragraphs, orgId);
  return NextResponse.json(outline);
}
