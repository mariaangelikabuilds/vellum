import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { syncCurrentUser } from '@/lib/auth/sync-user';

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  // ~500KB cap = ~50k words = generous for any single essay; protects against
  // scripted clients storing arbitrary blobs as proseText
  proseText: z.string().max(500_000).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  published: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(
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

  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  await db
    .update(documents)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id));

  return NextResponse.json({ ok: true });
}
