import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  const { detectClaims } = await import('../src/ai/agents/claim-detector');
  const { db } = await import('../src/db');
  const { orgs } = await import('../src/db/schema');
  const { eq } = await import('drizzle-orm');

  const [seedOrg] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, 'org_test_123'));
  if (!seedOrg) {
    throw new Error('Seed org not found. Run pnpm db:seed first.');
  }
  const orgId = seedOrg.id;

  const paragraphs = [
    'The current generation of AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument.',
    'Maybe Vellum will eventually solve this on its own, but it depends on whether the underlying CRDT work is too expensive.',
    'Clearbrief raised $5M in 2024 according to Crunchbase. Is the gap because of inference costs?',
  ];

  for (const para of paragraphs) {
    console.log('\n— input —');
    console.log(' ', para);

    const claims = await detectClaims(para, orgId);
    console.log('— claims —');
    for (const c of claims) {
      console.log(`  [${c.type}] (conf ${c.confidence}) ${c.text}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FAIL:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
