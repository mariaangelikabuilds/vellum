import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { detectClaims, type Claim } from '@/ai/agents/claim-detector';
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

  // Detect across all paragraphs in parallel (Haiku per call, ~200ms each).
  // Serial was ~n × 1.5s, parallel is ~1.5s total. Anthropic rate-limits
  // are well above v1 portfolio scale; if hit, fail-soft and return what landed.
  const detectionResults = await Promise.allSettled(
    paragraphs.map((para) => detectClaims(para, orgId)),
  );

  // Persist vertices in parallel too — each createClaimVertex runs one
  // Cypher round-trip; the connection pool handles concurrency.
  const insertPromises: Promise<unknown>[] = [];
  const allClaims: Claim[] = [];
  for (const result of detectionResults) {
    if (result.status !== 'fulfilled') continue;
    for (const c of result.value) {
      allClaims.push(c);
      insertPromises.push(
        createClaimVertex({
          id: crypto.randomUUID(),
          documentId: doc.id,
          text: c.text,
          type: c.type,
          confidence: c.confidence,
          positionStart: c.position[0],
          positionEnd: c.position[1],
        }),
      );
    }
  }
  await Promise.allSettled(insertPromises);

  return NextResponse.json({ claims: allClaims });
}
