import { db } from '@/db';
import { usage } from '@/db/schema';

export type UsageMeter = 'detector' | 'verifier' | 'gap';

/**
 * Records one row per agent call into the usage table. Section 5 will read
 * these rows and report metered usage to Stripe; for v1 we just collect.
 */
export async function trackAgentCall({
  orgId,
  meter,
  amount,
  costCents,
}: {
  orgId: string;
  meter: UsageMeter;
  amount: number;
  costCents: number;
}) {
  await db.insert(usage).values({
    orgId,
    meter: `${meter}_call`,
    amount,
    costUsdCents: costCents,
  });
}
