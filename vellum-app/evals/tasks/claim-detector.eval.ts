import { config } from 'dotenv';
import { Eval } from 'braintrust';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SCORERS, type DatasetRow, type DetectedClaim } from '../scorers';

config({ path: '.env.local' });

// braintrust CLI bundles to CJS so import.meta.url is unavailable;
// resolve from cwd which is the package root when running `pnpm eval`.
const datasetPath = path.resolve(process.cwd(), 'evals/datasets/claim-detection.jsonl');

async function loadDataset(): Promise<DatasetRow[]> {
  const raw = await fs.readFile(datasetPath, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as DatasetRow);
}

let cachedOrgId: string | null = null;
async function evalOrgId(): Promise<string> {
  if (cachedOrgId) return cachedOrgId;
  const { db } = await import('../../src/db');
  const { orgs } = await import('../../src/db/schema');
  const { eq } = await import('drizzle-orm');
  const [seedOrg] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, 'org_test_123'));
  if (!seedOrg) throw new Error('Seed org missing — run pnpm db:seed first');
  cachedOrgId = seedOrg.id;
  return cachedOrgId;
}

Eval('vellum-claim-detector-v1', {
  data: loadDataset,
  task: async (input: string): Promise<DetectedClaim[]> => {
    const orgId = await evalOrgId();
    const { detectClaims } = await import('../../src/ai/agents/claim-detector');
    return (await detectClaims(input, orgId)) as DetectedClaim[];
  },
  scores: [
    function claim_count_match({ output, expected }) {
      return {
        name: 'claim_count_match',
        score: SCORERS.claim_count_match(output as DetectedClaim[], expected as DatasetRow['expected']),
      };
    },
    function type_match({ output, expected }) {
      return {
        name: 'type_match',
        score: SCORERS.type_match(output as DetectedClaim[], expected as DatasetRow['expected']),
      };
    },
    function confidence_above_min({ output, expected }) {
      return {
        name: 'confidence_above_min',
        score: SCORERS.confidence_above_min(output as DetectedClaim[], expected as DatasetRow['expected']),
      };
    },
  ],
});
