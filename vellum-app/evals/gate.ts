// Regression gate. Runs the gold set through the live claim detector, scores it
// with the same functions the Braintrust eval uses, and fails the build when any
// score falls more than TOLERANCE below the committed baseline.
//
//   pnpm eval:gate                 score, compare, exit 1 on a regression
//   pnpm eval:gate --update        accept current scores as the new baseline
//
// The first run on a repo with no baseline.json writes one and passes, so a
// baseline is established from a real run rather than invented by hand.
import { config } from 'dotenv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SCORERS, type DatasetRow, type DetectedClaim, type ScoreName } from './scorers';

config({ path: '.env.local' });

const TOLERANCE = 0.05;
const ROOT = process.cwd();
const DATASET = path.resolve(ROOT, 'evals/datasets/claim-detection.jsonl');
const BASELINE = path.resolve(ROOT, 'evals/baseline.json');
const RESULTS = path.resolve(ROOT, 'evals/results.json');

interface Baseline {
  recorded_at: string;
  model: string;
  n: number;
  scores: Record<string, number>;
}

async function loadDataset(): Promise<DatasetRow[]> {
  const raw = await fs.readFile(DATASET, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as DatasetRow);
}

async function seedOrgId(): Promise<string> {
  const { db } = await import('../src/db');
  const { orgs } = await import('../src/db/schema');
  const { eq } = await import('drizzle-orm');
  const [org] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, 'org_test_123'));
  if (!org) throw new Error('Seed org missing, run pnpm db:seed first');
  return org.id;
}

async function main(): Promise<void> {
  const update = process.argv.includes('--update');
  const rows = await loadDataset();
  const orgId = await seedOrgId();
  const { detectClaims } = await import('../src/ai/agents/claim-detector');
  const { MODELS } = await import('../src/ai/client');

  const totals: Record<string, number> = {};
  let failures = 0;

  for (const [i, row] of rows.entries()) {
    let output: DetectedClaim[] = [];
    try {
      output = (await detectClaims(row.input, orgId)) as DetectedClaim[];
    } catch (err) {
      // A thrown row scores zero rather than aborting the run: one bad response
      // should show up as a score drop, not as a green build that never ran.
      failures++;
      console.error(`  row ${i + 1} threw: ${(err as Error).message}`);
    }
    for (const [name, score] of Object.entries(SCORERS)) {
      totals[name] = (totals[name] ?? 0) + score(output, row.expected);
    }
  }

  const scores: Record<string, number> = {};
  for (const name of Object.keys(SCORERS) as ScoreName[]) {
    scores[name] = Number(((totals[name] ?? 0) / rows.length).toFixed(4));
  }

  const current: Baseline = {
    recorded_at: new Date().toISOString(),
    model: MODELS.CHEAP,
    n: rows.length,
    scores,
  };
  await fs.writeFile(RESULTS, JSON.stringify(current, null, 2));

  console.log(`\nclaim detector, n=${rows.length}, model ${current.model}`);
  for (const [name, score] of Object.entries(scores)) {
    console.log(`  ${name.padEnd(22)} ${(score * 100).toFixed(2)}%`);
  }
  if (failures > 0) console.log(`  ${failures} row(s) threw and scored zero`);

  let baseline: Baseline | null = null;
  try {
    baseline = JSON.parse(await fs.readFile(BASELINE, 'utf8')) as Baseline;
  } catch {
    baseline = null;
  }

  if (!baseline || update) {
    await fs.writeFile(BASELINE, JSON.stringify(current, null, 2));
    console.log(`\nbaseline ${baseline ? 'updated' : 'established'} at evals/baseline.json`);
    return;
  }

  const regressions = Object.entries(scores).filter(
    ([name, score]) => score < (baseline!.scores[name] ?? 0) - TOLERANCE,
  );

  console.log(`\nbaseline recorded ${baseline.recorded_at} on ${baseline.model}`);
  for (const [name, score] of Object.entries(scores)) {
    const was = baseline.scores[name];
    if (was === undefined) continue;
    const delta = score - was;
    const sign = delta >= 0 ? '+' : '';
    console.log(`  ${name.padEnd(22)} ${sign}${(delta * 100).toFixed(2)} pts`);
  }

  if (regressions.length > 0) {
    console.error(
      `\nREGRESSION: ${regressions
        .map(([n, s]) => `${n} fell to ${(s * 100).toFixed(2)}% from ${((baseline!.scores[n] ?? 0) * 100).toFixed(2)}%`)
        .join('; ')}`,
    );
    console.error(`tolerance is ${TOLERANCE * 100} points. Re-baseline with pnpm eval:gate --update.`);
    process.exit(1);
  }

  console.log('\nno regression beyond tolerance');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
