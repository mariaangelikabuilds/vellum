import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';

const GapSchema = z.object({
  gaps: z.array(
    z.object({
      type: z.enum(['unsupported', 'unanswered', 'missing_premise', 'circular']),
      claimIds: z.array(z.string()),
      explanation: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    }),
  ),
});

export type Gap = z.infer<typeof GapSchema>['gaps'][number];

const GAP_SYSTEM = `You audit a document's claim graph for gaps:
- Claims with no supporting evidence (and that should have some)
- Questions raised but never answered later in the document
- Premises required for an argument that aren't stated
- Circular dependencies in the claim graph

Output JSON ONLY matching: {"gaps": [{"type": "unsupported"|"unanswered"|"missing_premise"|"circular", "claimIds": [string], "explanation": string, "severity": "low"|"medium"|"high"}]}.
No prose, no markdown fences.`;

export async function detectGaps(claimGraph: unknown, orgId: string): Promise<Gap[]> {
  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 2048,
    system: [{ type: 'text', text: GAP_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Claim graph:\n${JSON.stringify(claimGraph, null, 2)}` }],
  });

  const costCents = callCostCents({
    model: MODELS.REASONING,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'gap', amount: 1, costCents });

  const block = resp.content[0];
  const raw = block && block.type === 'text' ? block.text : '{"gaps": []}';
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch?.[1] ?? raw.trim();
  const parsed = GapSchema.parse(JSON.parse(jsonText));
  return parsed.gaps;
}
