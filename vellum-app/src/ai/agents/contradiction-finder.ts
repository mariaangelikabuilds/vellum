import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';

const ContradictionsSchema = z.object({
  contradictions: z.array(
    z.object({
      fromClaimId: z.string(),
      toClaimId: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      confidence: z.number().min(0).max(1),
      explanation: z.string(),
    }),
  ),
});

export type Contradiction = z.infer<typeof ContradictionsSchema>['contradictions'][number];

const CONTRADICTION_SYSTEM = `You scan a list of claims from a single essay and identify pairs that contradict.

A contradiction is substantive — two claims that cannot both be true as written, or that the essay treats inconsistently. Style differences, scope differences, or qualifications are NOT contradictions.

For each contradicting pair, return:
- fromClaimId / toClaimId — the two claim ids
- severity — low (minor tension) | medium (real conflict) | high (essay-breaking)
- confidence — 0-1 how confident you are this is a real contradiction
- explanation — one sentence on why they contradict

Output JSON ONLY, no prose, no fences:
{"contradictions": [{"fromClaimId": "...", "toClaimId": "...", "severity": "...", "confidence": 0.x, "explanation": "..."}]}

If no contradictions exist, return {"contradictions": []}. Do not invent.`;

export async function findContradictionsForClaims(
  claims: { id: string; text: string }[],
  orgId: string,
): Promise<Contradiction[]> {
  if (claims.length < 2) return [];

  const claimList = claims.map((c) => `- (${c.id}) ${c.text}`).join('\n');

  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 2048,
    system: [{ type: 'text', text: CONTRADICTION_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Claims to scan:\n\n${claimList}` }],
  });

  const costCents = callCostCents({
    model: MODELS.REASONING,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'verifier', amount: 1, costCents });

  const block = resp.content[0];
  const raw = block && block.type === 'text' ? block.text : '{"contradictions": []}';
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch?.[1] ?? raw.trim();
  return ContradictionsSchema.parse(JSON.parse(jsonText)).contradictions;
}
