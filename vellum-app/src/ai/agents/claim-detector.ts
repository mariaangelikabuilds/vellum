import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';

const ClaimSchema = z.object({
  claims: z.array(
    z.object({
      text: z.string(),
      type: z.enum(['factual', 'opinion', 'speculation', 'evidence', 'question']),
      confidence: z.number().min(0).max(1),
      position: z.tuple([z.number(), z.number()]),
    }),
  ),
});

export type Claim = z.infer<typeof ClaimSchema>['claims'][number];

const SYSTEM_PROMPT = `You analyze a single paragraph of writing and extract structured claims.

For each statement that makes a claim about reality, opinion, speculation, evidence, or question:
- text: the exact span of text from the paragraph
- type: one of "factual" | "opinion" | "speculation" | "evidence" | "question"
- confidence: 0-1 how confident you are this is the right type
- position: [start, end] character offsets in the paragraph

Output JSON ONLY matching this schema. No prose, no markdown fences, no explanation.

Examples:

Input: "The current generation of AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument."
Output: {"claims": [{"text": "AI writing tools is text-shaped — they polish prose but cannot see the structure of an argument", "type": "factual", "confidence": 0.84, "position": [33, 132]}]}

Input: "Is the gap because the underlying CRDT work is too expensive, or because inference costs were prohibitive?"
Output: {"claims": [{"text": "Is the gap because the underlying CRDT work is too expensive, or because inference costs were prohibitive?", "type": "question", "confidence": 0.95, "position": [0, 110]}]}

Input: "Maybe AI tools will eventually solve this on their own."
Output: {"claims": [{"text": "AI tools will eventually solve this on their own", "type": "speculation", "confidence": 0.78, "position": [6, 56]}]}
`;

export async function detectClaims(paragraph: string, orgId: string): Promise<Claim[]> {
  const response = await anthropic.messages.create({
    model: MODELS.CHEAP,
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: paragraph }],
  });

  const block = response.content[0];
  const raw = block && block.type === 'text' ? block.text : '';
  // Haiku occasionally wraps output in ```json fences despite system prompt
  // saying not to. Strip fences and any surrounding prose before parsing.
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch?.[1] ?? raw.trim();
  const parsed = ClaimSchema.parse(JSON.parse(jsonText));

  const costCents = callCostCents({
    model: MODELS.CHEAP,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'detector', amount: 1, costCents });

  return parsed.claims;
}
