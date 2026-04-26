import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { stripFences } from '../lib/strip-fences';

const Schema = z.object({
  plain: z.string(),
  unpacks: z.array(z.string()).max(4),
});

export type Explanation = z.infer<typeof Schema>;

const SYSTEM = `You explain a phrase the writer just selected from their own essay, *in the context of that essay*.

The goal: help the writer see their own phrase fresh — what it actually claims, what it assumes, what an attentive reader would unpack from it.

- \`plain\`: a 1-2 sentence plain reading of the phrase
- \`unpacks\`: 1-4 short bullet points of what's implicit, contested, or assumed

Be concrete and dry. Don't moralize, don't suggest changes. Just describe.

Output JSON ONLY, no prose, no fences:
{ "plain": "...", "unpacks": ["...", "..."] }`;

export async function explainPhrase({
  phrase,
  context,
  orgId,
}: {
  phrase: string;
  context: string;
  orgId: string;
}): Promise<Explanation> {
  const resp = await anthropic.messages.create({
    model: MODELS.REASONING,
    max_tokens: 600,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [
      { role: 'user', content: `Phrase: "${phrase}"\n\nEssay context:\n${context}` },
    ],
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
  const jsonText = stripFences(raw);
  return Schema.parse(JSON.parse(jsonText));
}
