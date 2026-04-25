import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { reconcileClaims } from '@/ai/agents/reconciler';
import { syncCurrentUser } from '@/lib/auth/sync-user';

const Body = z.object({
  documentId: z.string().uuid(),
  claimAText: z.string().min(1),
  claimBText: z.string().min(1),
  documentContext: z.string().min(1),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const user = await syncCurrentUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, parsed.data.documentId));
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (doc.orgId !== user.orgId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const orgId = user.orgId ?? doc.orgId;
  const result = await reconcileClaims({
    claimAText: parsed.data.claimAText,
    claimBText: parsed.data.claimBText,
    documentContext: parsed.data.documentContext,
    orgId,
  });

  return NextResponse.json(result);
}
