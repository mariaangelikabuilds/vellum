import { config } from 'dotenv';

config({ path: '.env.local' });

async function embedText(text: string): Promise<number[]> {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3-large' }),
  });
  const json = (await r.json()) as { data: { embedding: number[] }[] };
  if (!json.data[0]) throw new Error('Voyage returned no embedding');
  return json.data[0].embedding;
}

async function main() {
  const { db } = await import('../src/db');
  const { orgs, documents, bibliography } = await import('../src/db/schema');
  const { createClaimVertex, listClaimsForDocument } = await import('../src/db/graph');
  const { verifyClaim } = await import('../src/ai/agents/verifier');
  const { eq } = await import('drizzle-orm');

  // Use the seed org/doc.
  const [seedOrg] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, 'org_test_123'));
  if (!seedOrg) throw new Error('Seed missing — run pnpm db:seed first');
  const [seedDoc] = await db.select().from(documents).where(eq(documents.orgId, seedOrg.id));
  if (!seedDoc) throw new Error('No seed document');

  // Insert a bibliography row whose content supports the seed claim c1.
  const bibText =
    'Recent benchmarks show that AI writing tools focus on stylistic polish and grammar correction, ' +
    'but consistently fail to detect cross-paragraph contradictions in multi-thousand-word essays. ' +
    'Large language models lack persistent representation of an argument across long contexts.';

  console.log('Embedding bibliography text via Voyage…');
  const emb = await embedText(bibText);

  const [existing] = await db
    .select()
    .from(bibliography)
    .where(eq(bibliography.url, 'https://example.com/ai-writing-study'));
  if (!existing) {
    await db.insert(bibliography).values({
      documentId: seedDoc.id,
      url: 'https://example.com/ai-writing-study',
      title: 'On the limits of stylistic AI writing tools',
      contentSnapshot: bibText,
      embedding: emb,
      fetchedAt: new Date(),
    });
    console.log('✓ inserted bibliography row');
  } else {
    console.log('· bibliography row already present, skipping insert');
  }

  // Refresh claims (seed creates c1, c2 — load them)
  const claims = await listClaimsForDocument(seedDoc.id);
  if (claims.length === 0) {
    // Re-seed claims if missing
    await createClaimVertex({
      id: 'c1',
      documentId: seedDoc.id,
      text: 'AI writing tools dont flag cross-paragraph contradictions',
      type: 'factual',
      confidence: 0.84,
      positionStart: 100,
      positionEnd: 150,
    });
    await createClaimVertex({
      id: 'c2',
      documentId: seedDoc.id,
      text: 'Clearbrief proves the model in legal',
      type: 'factual',
      confidence: 0.91,
      positionStart: 200,
      positionEnd: 245,
    });
  }

  console.log('\nRunning verifier on c1…');
  const resp = await verifyClaim({
    claimId: 'c1',
    claimText: 'AI writing tools dont flag cross-paragraph contradictions',
    documentId: seedDoc.id,
    orgId: seedOrg.id,
    otherClaims: [{ id: 'c2', text: 'Clearbrief proves the model in legal' }],
  });

  console.log('\n--- verifier final response ---');
  for (const block of resp.content) {
    if (block.type === 'text') console.log(block.text);
    else if (block.type === 'tool_use') console.log(`(tool_use: ${block.name})`);
  }
  console.log('\nstop_reason:', resp.stop_reason);
  console.log('input tokens :', resp.usage.input_tokens);
  console.log('output tokens:', resp.usage.output_tokens);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FAIL:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
