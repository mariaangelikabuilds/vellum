import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents, subscribers } from '@/db/schema';

const Body = z.object({ email: z.string().email() });

/**
 * Anonymous endpoint: a reader subscribes to a published essay's author.
 * Idempotent — repeated subscribes for the same email are fine.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!doc.published) {
    return NextResponse.json({ error: 'not published' }, { status: 403 });
  }
  if (!doc.authorUserId) {
    return NextResponse.json({ error: 'no author' }, { status: 422 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid email' }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();

  // dedupe by author + email
  const existing = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(subscribers).values({
      authorUserId: doc.authorUserId,
      email,
    });
  }

  return NextResponse.json({ ok: true });
}
