import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { detectClaims } from '@/ai/agents/claim-detector';
import { createClaimVertex } from '@/db/graph';
import { syncCurrentUser } from '@/lib/auth/sync-user';

const Body = z.object({
  paragraph: z.string().min(1),
  documentId: z.string().uuid(),
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
  const claims = await detectClaims(parsed.data.paragraph, orgId);

  for (const c of claims) {
    await createClaimVertex({
      id: crypto.randomUUID(),
      documentId: doc.id,
      text: c.text,
      type: c.type,
      confidence: c.confidence,
      positionStart: c.position[0],
      positionEnd: c.position[1],
    });
  }

  return NextResponse.json({ claims });
}
