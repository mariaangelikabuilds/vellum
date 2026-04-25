import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { findContradictionsForClaims } from '@/ai/agents/contradiction-finder';
import { listClaimsForDocument, addEdge } from '@/db/graph';
import { syncCurrentUser } from '@/lib/auth/sync-user';

interface AGRow {
  id: unknown;
  text: unknown;
  type: unknown;
  confidence: unknown;
}

function unquote(v: unknown): string {
  return String(v ?? '').replace(/^"|"$/g, '');
}

export async function POST(
  _req: Request,
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

  const orgId = user.orgId ?? doc.orgId;
  const rawClaims = (await listClaimsForDocument(doc.id)) as unknown as AGRow[];
  const claims = rawClaims.map((r) => ({ id: unquote(r.id), text: unquote(r.text) }));

  if (claims.length < 2) {
    return NextResponse.json({ contradictions: [] });
  }

  const found = await findContradictionsForClaims(claims, orgId);

  // persist as :contradicts edges in the AGE graph so Map tab + future passes see them
  for (const c of found) {
    try {
      await addEdge(c.fromClaimId, c.toClaimId, 'contradicts', {
        confidence: c.confidence,
        severity: c.severity,
        explanation: c.explanation,
      });
    } catch {
      // edge may already exist or cypher edge-syntax may need tweaking; non-fatal
    }
  }

  // update denormalized count on the document for the public viewer
  await db
    .update(documents)
    .set({ contradictionCount: found.length, updatedAt: new Date() })
    .where(eq(documents.id, doc.id));

  return NextResponse.json({ contradictions: found });
}
