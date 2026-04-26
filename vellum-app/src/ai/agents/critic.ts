import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { stripFences } from '../lib/strip-fences';

const CritiqueSchema = z.object({
  notes: z.array(
    z.object({
      severity: z.enum(['low', 'medium', 'high']),
      kind: z.enum([
        'weak_premise',
        'unsupported_claim',
        'missing_counterargument',
        'leap_in_logic',
        'tone_drift',
        'overclaim',
        'circular',
      ]),
      paragraphIndex: z.number().int().min(0),
      comment: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
});

export type Critique = z.infer<typeof CritiqueSchema>['notes'][number];

const CRITIC_SYSTEM = `You are a senior critic for The New York Review of Books reviewing a draft essay before publication.

Read the draft. Mark every weakness a hostile-but-fair editor would mark.
Categories:
- weak_premise: a foundational claim is hand-waved
- unsupported_claim: a factual assertion lacks evidence or citation
- missing_counterargument: an obvious objection is ignored
- leap_in_logic: the inference between paragraphs is unjustified
- tone_drift: voice or register shifts without reason
- overclaim: claim is too strong for the evidence given
- circular: argument relies on what it's trying to prove

Output JSON ONLY, no prose, no fences:
{"notes": [{"severity": "low"|"medium"|"high", "kind": "<one of above>", "paragraphIndex": <0-based int>, "comment": "<one sentence>", "suggestion": "<optional one-line revision idea>"}]}

Be substantive. A draft with no notes is suspicious — find at least one. A draft with 20 notes is unhelpful — pick the most load-bearing 3-7.`;

export async function critiqueDocument(
  paragraphs: string[],
  orgId: string,
): Promise<Critique[]> {
  const numbered = paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n');

  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 2048,
    system: [{ type: 'text', text: CRITIC_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Draft:\n\n${numbered}` }],
  });

  const costCents = callCostCents({
    model: MODELS.REASONING,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'gap', amount: 1, costCents });

  const block = resp.content[0];
  const raw = block && block.type === 'text' ? block.text : '{"notes": []}';
  const jsonText = stripFences(raw);
  const parsed = CritiqueSchema.parse(JSON.parse(jsonText));
  return parsed.notes;
}
