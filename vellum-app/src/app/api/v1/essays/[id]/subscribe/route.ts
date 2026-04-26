import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents, subscribers } from '@/db/schema';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({ email: z.string().email() });

/**
 * Anonymous endpoint: a reader subscribes to a published essay's author.
 * Dedup is by (authorUserId, email) — same email can subscribe to multiple
 * authors. Rate-limited per IP to deter junk floods.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anon';
  const limit = rateLimit(`subscribe:${ip}`, { tokens: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'too many subscribes — try again in a minute' },
      { status: 429 },
    );
  }

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

  // dedupe by (authorUserId, email) — fixes the v1 bug where the same email
  // could only ever subscribe to one author
  const existing = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(
      and(eq(subscribers.authorUserId, doc.authorUserId), eq(subscribers.email, email)),
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(subscribers).values({
      authorUserId: doc.authorUserId,
      email,
    });
  }

  return NextResponse.json({ ok: true });
}
