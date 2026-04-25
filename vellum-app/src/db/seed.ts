import { config } from 'dotenv';

config({ path: '.env.local' });

// Dynamic imports below run AFTER dotenv loads so the Pool in ./index
// reads the correct DATABASE_URL (.env.local). Static imports would
// initialize the Pool with DATABASE_URL=undefined → ECONNREFUSED.

async function seed() {
  const { db } = await import('./index');
  const { orgs, users, documents } = await import('./schema');
  const { createClaimVertex, deleteClaim } = await import('./graph');
  const { eq } = await import('drizzle-orm');

  // Idempotent: clean test data first so reruns succeed.
  await deleteClaim('c1').catch(() => {});
  await deleteClaim('c2').catch(() => {});
  await db.delete(orgs).where(eq(orgs.clerkOrgId, 'org_test_123'));


  const [org] = await db
    .insert(orgs)
    .values({ name: 'Test Org', clerkOrgId: 'org_test_123' })
    .returning();
  if (!org) throw new Error('Failed to create org');

  const [user] = await db
    .insert(users)
    .values({ clerkUserId: 'user_test_123', email: 'angel@test.com', orgId: org.id })
    .returning();
  if (!user) throw new Error('Failed to create user');

  const [doc] = await db
    .insert(documents)
    .values({ orgId: org.id, authorUserId: user.id, title: 'My first essay' })
    .returning();
  if (!doc) throw new Error('Failed to create document');

  await createClaimVertex({
    id: 'c1',
    documentId: doc.id,
    text: "AI writing tools dont flag cross-paragraph contradictions",
    type: 'factual',
    confidence: 0.84,
    positionStart: 100,
    positionEnd: 150,
  });

  await createClaimVertex({
    id: 'c2',
    documentId: doc.id,
    text: 'Clearbrief proves the model in legal',
    type: 'factual',
    confidence: 0.91,
    positionStart: 200,
    positionEnd: 245,
  });

  console.log('seed complete');
  console.log('  org    ', org.id);
  console.log('  user   ', user.id);
  console.log('  doc    ', doc.id);
  console.log('  claims c1, c2 in vellum_claims graph');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
