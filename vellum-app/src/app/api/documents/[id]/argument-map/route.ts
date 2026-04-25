import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

interface AGRow {
  [key: string]: unknown;
}

function unquote(v: unknown): string {
  return String(v ?? '').replace(/^"|"$/g, '');
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { id } = await params;

  const claimsRes = await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'vellum_claims'`)}, $$
      MATCH (n:Claim {documentId: $docId})
      RETURN n.id AS id, n.text AS text, n.type AS type, n.confidence AS confidence
    $$, ${JSON.stringify({ docId: id })})
    AS (id agtype, text agtype, type agtype, confidence agtype);
  `);

  const edgesRes = await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'vellum_claims'`)}, $$
      MATCH (a:Claim {documentId: $docId})-[r]->(b:Claim {documentId: $docId})
      RETURN a.id AS from_id, b.id AS to_id, type(r) AS edge_type,
             r.confidence AS confidence, r.severity AS severity
    $$, ${JSON.stringify({ docId: id })})
    AS (from_id agtype, to_id agtype, edge_type agtype, confidence agtype, severity agtype);
  `);

  const claimsRows = claimsRes.rows as unknown as AGRow[];
  const edgesRows = edgesRes.rows as unknown as AGRow[];

  return NextResponse.json({
    claims: claimsRows.map((r) => ({
      id: unquote(r.id),
      text: unquote(r.text),
      type: unquote(r.type),
      confidence: Number(r.confidence ?? 0),
    })),
    edges: edgesRows.map((r) => ({
      from: unquote(r.from_id),
      to: unquote(r.to_id),
      type: unquote(r.edge_type),
      confidence: Number(r.confidence ?? 0),
      severity: unquote(r.severity),
    })),
  });
}
