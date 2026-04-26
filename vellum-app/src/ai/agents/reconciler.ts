import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { stripFences } from '../lib/strip-fences';

const ReconciliationSchema = z.object({
  rewrite: z.string(),
  reasoning: z.string(),
  preserves: z.array(z.string()),
  drops: z.array(z.string()),
});

export type Reconciliation = z.infer<typeof ReconciliationSchema>;

const RECONCILER_SYSTEM = `You are an editor reconciling a contradiction between two claims in the same essay.

Given two claims that contradict, write ONE rewrite that:
1. Preserves the load-bearing intent of both claims where possible
2. Resolves the contradiction explicitly (not by hand-waving)
3. Keeps the author's voice — do not rewrite stylistically
4. Is one paragraph or less

Output JSON ONLY, no prose, no fences:
{
  "rewrite": "<the unified replacement paragraph>",
  "reasoning": "<one sentence on what you reconciled>",
  "preserves": ["<short phrase from claim A still in the rewrite>", ...],
  "drops": ["<short phrase that had to be dropped>", ...]
}`;

export async function reconcileClaims({
  claimAText,
  claimBText,
  documentContext,
  orgId,
}: {
  claimAText: string;
  claimBText: string;
  documentContext: string;
  orgId: string;
}): Promise<Reconciliation> {
  const userMessage = `Document context:\n${documentContext}\n\n---\n\nContradicting claims to reconcile:\n\nClaim A: "${claimAText}"\nClaim B: "${claimBText}"`;

  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 1024,
    system: [{ type: 'text', text: RECONCILER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  const costCents = callCostCents({
    model: MODELS.REASONING,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'verifier', amount: 1, costCents });

  const block = resp.content[0];
  const raw = block && block.type === 'text' ? block.text : '';
  const jsonText = stripFences(raw);
  return ReconciliationSchema.parse(JSON.parse(jsonText));
}
