import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';

const OutlineSchema = z.object({
  summary: z.string(),
  bullets: z.array(
    z.object({
      claim: z.string(),
      kind: z.enum(['premise', 'conclusion', 'evidence', 'counterargument', 'aside']),
      paragraphIndex: z.number().int().min(0),
    }),
  ),
  coherence: z.object({
    rating: z.enum(['low', 'medium', 'high']),
    note: z.string(),
  }),
});

export type Outline = z.infer<typeof OutlineSchema>;

const SYSTEM = `You produce a reverse outline of a draft essay — the bullet structure of what was actually written, vs. an outline written before drafting.

For each paragraph, identify:
- the load-bearing claim (one sentence)
- whether it's a premise, conclusion, evidence, counterargument, or aside
- which paragraph it came from (0-indexed)

Then assess coherence:
- low: claims don't connect, leaps in logic, missing premises
- medium: argument is roughly sound but has gaps or detours
- high: every paragraph earns its place; conclusions follow from premises

Output JSON ONLY, no prose, no fences:
{
  "summary": "<one-sentence summary of the whole essay>",
  "bullets": [{"claim": "...", "kind": "premise|conclusion|evidence|counterargument|aside", "paragraphIndex": 0}],
  "coherence": {"rating": "low|medium|high", "note": "<one sentence on what's working / broken>"}
}`;

export async function reverseOutline(paragraphs: string[], orgId: string): Promise<Outline> {
  const numbered = paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n');

  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
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
  const raw = block && block.type === 'text' ? block.text : '';
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch?.[1] ?? raw.trim();
  return OutlineSchema.parse(JSON.parse(jsonText));
}
