import { sql } from 'drizzle-orm';
import { db } from './index';

const GRAPH = 'vellum_claims';

export interface ClaimVertex {
  id: string;
  documentId: string;
  text: string;
  type: 'factual' | 'opinion' | 'speculation' | 'evidence' | 'question';
  confidence: number;
  positionStart: number;
  positionEnd: number;
}

export type EdgeType = 'supports' | 'contradicts' | 'qualifies' | 'depends_on';

export async function createClaimVertex(v: ClaimVertex) {
  const params = JSON.stringify(v);
  const result = await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'${GRAPH}'`)}, $$
      CREATE (n:Claim {
        id: $id,
        documentId: $documentId,
        text: $text,
        type: $type,
        confidence: $confidence,
        positionStart: $positionStart,
        positionEnd: $positionEnd,
        createdAt: timestamp()
      })
      RETURN n
    $$, ${params}) AS (n agtype);
  `);
  return result.rows[0];
}

// Defense-in-depth allow-list for AGE edge labels — `sql.raw(type)` interpolates
// the value directly into Cypher, so even though TS narrows it to EdgeType, a
// future refactor passing `string` would be a SQL-injection footgun. Assert
// membership at runtime so the boundary stays trustworthy.
const ALLOWED_EDGE_TYPES = new Set<EdgeType>([
  'supports',
  'contradicts',
  'qualifies',
  'depends_on',
]);

export async function addEdge(
  fromClaimId: string,
  toClaimId: string,
  type: EdgeType,
  props: Record<string, unknown> = {},
) {
  if (!ALLOWED_EDGE_TYPES.has(type)) {
    throw new Error(`addEdge: invalid edge type "${type}"`);
  }
  const params = JSON.stringify({ from: fromClaimId, to: toClaimId, ...props });
  const propsCypher = Object.keys(props)
    .map((k) => `${k}: $${k}`)
    .join(', ');
  const propsClause = propsCypher.length > 0 ? `{${propsCypher}}` : '';
  await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'${GRAPH}'`)}, $$
      MATCH (a:Claim {id: $from}), (b:Claim {id: $to})
      CREATE (a)-[r:${sql.raw(type)} ${sql.raw(propsClause)}]->(b)
      RETURN r
    $$, ${params}) AS (r agtype);
  `);
}

export async function findContradictions(documentId: string) {
  const result = await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'${GRAPH}'`)}, $$
      MATCH (a:Claim {documentId: $docId})-[r:contradicts]->(b:Claim {documentId: $docId})
      RETURN a.id AS from_id, a.text AS from_text,
             b.id AS to_id, b.text AS to_text,
             r.confidence AS confidence, r.severity AS severity
    $$, ${JSON.stringify({ docId: documentId })})
    AS (from_id agtype, from_text agtype, to_id agtype, to_text agtype, confidence agtype, severity agtype);
  `);
  return result.rows;
}

export async function findSupportingEvidence(claimId: string) {
  const result = await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'${GRAPH}'`)}, $$
      MATCH (e:Claim {type: "evidence"})-[r:supports]->(c:Claim {id: $cid})
      RETURN e.id, e.text, r.confidence
    $$, ${JSON.stringify({ cid: claimId })})
    AS (id agtype, text agtype, confidence agtype);
  `);
  return result.rows;
}

export async function deleteClaim(claimId: string) {
  await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'${GRAPH}'`)}, $$
      MATCH (n:Claim {id: $cid})
      DETACH DELETE n
    $$, ${JSON.stringify({ cid: claimId })}) AS (n agtype);
  `);
}

export async function listClaimsForDocument(documentId: string) {
  const result = await db.execute(sql`
    SELECT * FROM cypher(${sql.raw(`'${GRAPH}'`)}, $$
      MATCH (n:Claim {documentId: $docId})
      RETURN n.id AS id, n.text AS text, n.type AS type, n.confidence AS confidence
    $$, ${JSON.stringify({ docId: documentId })})
    AS (id agtype, text agtype, type agtype, confidence agtype);
  `);
  return result.rows;
}
