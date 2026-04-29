import { z } from 'zod';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { stripFences } from '../lib/strip-fences';

export type IntentMarkKind = 'miss' | 'bury' | 'drift' | 'land';

const MarkSchema = z.object({
  kind: z.enum(['miss', 'bury', 'drift', 'land']),
  quote: z.string().min(1).max(500),
  why: z.string().min(1).max(240),
  suggestion: z.string().max(500).optional(),
});

const ResponseSchema = z.object({
  marks: z.array(MarkSchema).max(20),
});

export type IntentMark = z.infer<typeof MarkSchema>;
export type IntentMarkResult = z.infer<typeof ResponseSchema> & {
  /** char offsets resolved on the server after the model returns quotes */
  located: Array<IntentMark & { start: number; end: number }>;
};

const SYSTEM = `You are a copy desk reader. The writer has declared an intent (one sentence: what the writing should do or feel). Read the draft against that intent and identify the lines that matter.

You return up to 20 marks. Each mark is one verbatim quote from the draft, classified:

- "miss": the line is technically correct but doesn't do what the intent said. Flat, generic, dead on the page.
- "bury": the line softens or buries the real thing. Hedge phrases ("I just wanted to maybe..."), qualifiers that mute the point, polite cover that hides the meaning.
- "drift": tonal mismatch with the declared register. A cold line in a tender piece, a stiff line in a casual one, a clinical line in a personal one.
- "land": the line does hit the intent. The piece earns this sentence. Positive marks belong here, the writer should see what is working.

Rules:
- Quotes must be verbatim spans from the draft. No paraphrasing.
- Each quote should be a single sentence or a short clause, not a whole paragraph.
- Skip lines that are neutral. Mark only the ones that miss, bury, drift, or land in a way the writer should see.
- If the intent is empty or vague ("I want this to be good"), return marks: [].
- A given line can carry at most one mark. Pick the most accurate kind.
- Be honest. False positives erode trust faster than missed flags.

Return JSON ONLY in this exact shape:

{
  "marks": [
    {
      "kind": "miss" | "bury" | "drift" | "land",
      "quote": "<verbatim span from the draft>",
      "why": "<one sentence on why this kind, plain copy-desk language>",
      "suggestion": "<optional one-line rewrite that lands the intent>"
    }
  ]
}

If nothing in the draft is worth marking yet, return { "marks": [] }.`;

export async function checkIntent({
  text,
  intent,
  orgId,
}: {
  text: string;
  intent: string;
  orgId: string;
}): Promise<IntentMarkResult> {
  if (!intent.trim() || intent.trim().length < 4) {
    return { marks: [], located: [] };
  }
  if (!text.trim()) {
    return { marks: [], located: [] };
  }

  const userMessage = `INTENT: ${intent.trim()}

DRAFT:
${text.slice(0, 12000)}`;

  const resp = await anthropic.messages.create({
    model: MODELS.CHEAP,
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });

  const costCents = callCostCents({
    model: MODELS.CHEAP,
    inputTokens: resp.usage.input_tokens,
    outputTokens: resp.usage.output_tokens,
    cacheReadTokens: resp.usage.cache_read_input_tokens ?? 0,
  });
  await trackAgentCall({ orgId, meter: 'intent-check', amount: 1, costCents });

  const block = resp.content[0];
  const raw = block && block.type === 'text' ? block.text : '';
  const jsonText = stripFences(raw);

  let parsed: z.infer<typeof ResponseSchema>;
  try {
    parsed = ResponseSchema.parse(JSON.parse(jsonText));
  } catch {
    return { marks: [], located: [] };
  }

  const located = parsed.marks
    .map((m) => {
      const start = text.indexOf(m.quote);
      if (start === -1) return null;
      return { ...m, start, end: start + m.quote.length };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return { ...parsed, located };
}
