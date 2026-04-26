import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { stripFences } from '../lib/strip-fences';

const SuggestionSchema = z.object({
  continuation: z.string(),
  reasoning: z.string(),
  flagged: z.array(
    z.object({
      span: z.string(),
      kind: z.enum(['unverified_factual', 'speculation_marked', 'overclaim_avoided']),
      note: z.string(),
    }),
  ),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

const COWRITER_SYSTEM = `You are a co-writer extending an essay in the author's voice.

Hard constraints:
- Match the author's voice, register, and sentence rhythm. Read carefully and mirror.
- Never invent specific facts (dates, numbers, names of people, organizations, statistics, or quotes) that aren't explicitly supported by the existing prose.
- If you need a claim that requires evidence, write a more careful version: "many writers have argued…" instead of "73% of writers say…" unless 73% appears in the prose.
- Mark in your "flagged" array any phrase a verifier should double-check.
- Output one paragraph maximum, often shorter. Less is more.

Output JSON ONLY, no prose, no fences:
{
  "continuation": "<the next paragraph in the author's voice>",
  "reasoning": "<one short sentence: what direction you took the thought>",
  "flagged": [{"span": "<exact phrase>", "kind": "unverified_factual|speculation_marked|overclaim_avoided", "note": "<why>"}]
}`;

export async function suggestContinuation({
  paragraphs,
  orgId,
}: {
  paragraphs: string[];
  orgId: string;
}): Promise<Suggestion> {
  const draft = paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n');

  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 800,
    system: [{ type: 'text', text: COWRITER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Existing draft:\n\n${draft}\n\nWrite the next paragraph.` }],
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
  return SuggestionSchema.parse(JSON.parse(jsonText));
}
