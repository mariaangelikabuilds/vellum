import type Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { anthropic, MODELS, callCostCents } from '../client';
import { trackAgentCall } from '@/lib/billing/track-usage';
import { db } from '@/db';
import { addEdge } from '@/db/graph';

const tools: Anthropic.Tool[] = [
  {
    name: 'search_bibliography',
    description: "Semantic search over the document's bibliography. Returns top-k passages with URLs.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        k: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_web',
    description: 'Web search via Exa for corroborating or contradicting sources. Use sparingly; expensive.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'mark_supported',
    description: 'Mark a claim as supported by a source.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: { type: 'string' },
        sourceUrl: { type: 'string' },
        confidence: { type: 'number' },
      },
      required: ['claimId', 'sourceUrl', 'confidence'],
    },
  },
  {
    name: 'mark_contradicted',
    description: 'Mark a claim as contradicting another claim. Provide reasoning.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: { type: 'string' },
        contradictsClaimId: { type: 'string' },
        explanation: { type: 'string' },
        confidence: { type: 'number' },
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
      required: ['claimId', 'contradictsClaimId', 'explanation', 'confidence', 'severity'],
    },
  },
];

async function embedText(text: string): Promise<number[]> {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: 'voyage-3-large' }),
  });
  const json = (await r.json()) as { data: { embedding: number[] }[] };
  if (!json.data[0]) throw new Error('Voyage returned no embedding');
  return json.data[0].embedding;
}

async function handleTool(
  name: string,
  input: Record<string, unknown>,
  ctx: { documentId: string; orgId: string },
): Promise<unknown> {
  switch (name) {
    case 'search_bibliography': {
      const queryEmb = await embedText(input.query as string);
      const vecLiteral = `[${queryEmb.join(',')}]`;
      const k = (input.k as number) ?? 5;
      const result = await db.execute(sql`
        SELECT id, url, title, content_snapshot,
               1 - (embedding <=> ${vecLiteral}::vector) AS similarity
          FROM bibliography
         WHERE document_id = ${ctx.documentId}
         ORDER BY embedding <=> ${vecLiteral}::vector
         LIMIT ${k}
      `);
      return result.rows;
    }

    case 'search_web': {
      // Exa: use type 'auto' (v3+ API; 'neural' was deprecated in 2025).
      const r = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EXA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input.query,
          numResults: 5,
          type: 'auto',
          contents: { text: { maxCharacters: 20000 } },
        }),
      });
      const json = (await r.json()) as { results?: unknown[] };
      return json.results ?? [];
    }

    case 'mark_supported': {
      // v1: just record the URL on the claim's metadata via a 'supports' edge
      // to a synthetic Evidence vertex. For now just return ok; the verifier
      // returns its decisions in the final assistant message and the caller
      // can persist them.
      return { ok: true, claimId: input.claimId, sourceUrl: input.sourceUrl };
    }

    case 'mark_contradicted': {
      await addEdge(input.claimId as string, input.contradictsClaimId as string, 'contradicts', {
        explanation: input.explanation,
        confidence: input.confidence,
        severity: input.severity,
      });
      return { ok: true };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const VERIFIER_SYSTEM = `You verify claims in a document by retrieving evidence.

For each claim you receive, decide:
1. Is this claim supported by the document's bibliography? (use search_bibliography)
2. If insufficient, search the web (use search_web sparingly).
3. If supported, call mark_supported.
4. Look for contradictions with other claims in the same document; if found, call mark_contradicted.

Be conservative. Only mark supported with confidence >= 0.7. Only mark contradicted if the conflict is substantive, not stylistic.`;

export async function verifyClaim({
  claimId,
  claimText,
  documentId,
  orgId,
  otherClaims,
}: {
  claimId: string;
  claimText: string;
  documentId: string;
  orgId: string;
  otherClaims: { id: string; text: string }[];
}) {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Claim to verify (id=${claimId}): "${claimText}"\n\nOther claims in this document:\n${otherClaims
        .map((c) => `- (${c.id}) ${c.text}`)
        .join('\n')}`,
    },
  ];

  let totalIn = 0;
  let totalOut = 0;
  let totalCacheRead = 0;

  for (let i = 0; i < 8; i++) {
    const resp = await anthropic.messages.create({
      model: MODELS.REASONING,
      max_tokens: 2048,
      system: [{ type: 'text', text: VERIFIER_SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
    });

    totalIn += resp.usage.input_tokens;
    totalOut += resp.usage.output_tokens;
    totalCacheRead += resp.usage.cache_read_input_tokens ?? 0;

    messages.push({ role: 'assistant', content: resp.content });

    if (resp.stop_reason === 'tool_use') {
      const toolBlocks = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolBlocks) {
        const result = await handleTool(block.name, block.input as Record<string, unknown>, {
          documentId,
          orgId,
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    const costCents = callCostCents({
      model: MODELS.REASONING,
      inputTokens: totalIn,
      outputTokens: totalOut,
      cacheReadTokens: totalCacheRead,
    });
    await trackAgentCall({ orgId, meter: 'verifier', amount: 1, costCents });
    return resp;
  }

  throw new Error('Verifier exceeded 8 iterations');
}
