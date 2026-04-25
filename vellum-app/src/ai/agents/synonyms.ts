import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';

const SchemaResp = z.object({
  alternatives: z
    .array(
      z.object({
        word: z.string(),
        connotation: z.string(),
        register: z.enum(['formal', 'neutral', 'informal']).optional(),
      }),
    )
    .max(8),
});

export type SynonymSuggestion = z.infer<typeof SchemaResp>;

const SYSTEM = `You are a context-aware thesaurus. Given a single word selected from a sentence, suggest 4-7 alternatives that fit the *exact* sentence and meaning the word carries there.

Rules:
- Read the surrounding sentence carefully.
- Each alternative should be a true substitute — preserve meaning + grammar + register.
- For each, include a short \`connotation\` note (one phrase) explaining the shade of meaning.
- Optionally tag \`register\` as formal / neutral / informal.
- Don't suggest the original word back.

Output JSON ONLY, no prose, no fences:
{
  "alternatives": [
    {"word": "...", "connotation": "...", "register": "formal|neutral|informal"}
  ]
}`;

export async function suggestSynonyms({
  word,
  sentence,
  orgId,
}: {
  word: string;
  sentence: string;
  orgId: string;
}): Promise<SynonymSuggestion> {
  const resp = await anthropic.messages.create({
    model: MODELS.CHEAP,
    max_tokens: 600,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Word: "${word}"\nSentence: "${sentence}"` }],
  });

  const costCents = callCostCents({
    model: MODELS.CHEAP,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'detector', amount: 1, costCents });

  const block = resp.content[0];
  const raw = block && block.type === 'text' ? block.text : '';
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch?.[1] ?? raw.trim();
  return SchemaResp.parse(JSON.parse(jsonText));
}
