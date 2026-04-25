import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { detectClaims } from '@/ai/agents/claim-detector';
import { createClaimVertex } from '@/db/graph';
import { syncCurrentUser } from '@/lib/auth/sync-user';

// Accept either single paragraph (legacy) or array (new client).
const Body = z.union([
  z.object({
    paragraph: z.string().min(1),
    documentId: z.string().uuid(),
  }),
  z.object({
    paragraphs: z.array(z.string()).min(1),
    documentId: z.string().uuid(),
    replace: z.boolean().optional(),
  }),
]);

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
  const paragraphs = 'paragraph' in parsed.data ? [parsed.data.paragraph] : parsed.data.paragraphs;
  const replace = 'replace' in parsed.data ? parsed.data.replace : false;

  // Replace mode: clear all existing claim vertices for this document first.
  if (replace) {
    await db.execute(sql`
      SELECT * FROM cypher(${sql.raw(`'vellum_claims'`)}, $$
        MATCH (n:Claim {documentId: $docId})
        DETACH DELETE n
      $$, ${JSON.stringify({ docId: doc.id })}) AS (n agtype);
    `);
  }

  const allClaims = [];
  for (const para of paragraphs) {
    const claims = await detectClaims(para, orgId);
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
      allClaims.push(c);
    }
  }

  return NextResponse.json({ claims: allClaims });
}
