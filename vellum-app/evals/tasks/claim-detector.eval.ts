import { config } from 'dotenv';
import { Eval } from 'braintrust';
import { promises as fs } from 'node:fs';
import path from 'node:path';

config({ path: '.env.local' });

// braintrust CLI bundles to CJS so import.meta.url is unavailable;
// resolve from cwd which is the package root when running `pnpm eval`.
const datasetPath = path.resolve(process.cwd(), 'evals/datasets/claim-detection.jsonl');

interface ExpectedClaim {
  text: string;
  type: string;
  confidence_min: number;
}

interface DatasetRow {
  input: string;
  expected: { claims: ExpectedClaim[] };
}

interface DetectedClaim {
  text: string;
  type: string;
  confidence: number;
  position: [number, number];
}

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
      const expectedCount = (expected as DatasetRow['expected']).claims.length;
      return {
        name: 'claim_count_match',
        score: (output as DetectedClaim[]).length === expectedCount ? 1 : 0,
      };
    },
    function type_match({ output, expected }) {
      const expClaims = (expected as DatasetRow['expected']).claims;
      const outClaims = output as DetectedClaim[];
      let matches = 0;
      for (const exp of expClaims) {
        const found = outClaims.find(
          (c) => c.text.toLowerCase().includes(exp.text.toLowerCase().slice(0, 30)) && c.type === exp.type,
        );
        if (found) matches++;
      }
      return { name: 'type_match', score: expClaims.length === 0 ? 1 : matches / expClaims.length };
    },
    function confidence_above_min({ output, expected }) {
      const expClaims = (expected as DatasetRow['expected']).claims;
      const outClaims = output as DetectedClaim[];
      let matches = 0;
      for (const exp of expClaims) {
        const found = outClaims.find((c) =>
          c.text.toLowerCase().includes(exp.text.toLowerCase().slice(0, 30)),
        );
        if (found && found.confidence >= exp.confidence_min) matches++;
      }
      return {
        name: 'confidence_above_min',
        score: expClaims.length === 0 ? 1 : matches / expClaims.length,
      };
    },
  ],
});
