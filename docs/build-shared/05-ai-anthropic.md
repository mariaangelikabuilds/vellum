# 05 · AI integration — Anthropic SDK + streaming + tool use

## Step 1 — Install

```bash
pnpm add @anthropic-ai/sdk
pnpm add -D @types/node
```

## Step 2 — Env

```dotenv
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Step 3 — Client + cost-aware model routing

`src/lib/ai/client.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODELS = {
  REASONING: 'claude-sonnet-4-6',     // high-stakes reasoning, eval-graded
  CHEAP: 'claude-haiku-4-5-20251001', // high-volume classification, sub-second
} as const;

export type ModelTier = keyof typeof MODELS;
```

## Step 4 — Streaming wrapper

`src/lib/ai/stream.ts`:

```typescript
import { anthropic, MODELS, type ModelTier } from './client';

export interface StreamOpts {
  tier?: ModelTier;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  /** Cache the system prompt (90%+ hit rate on a stable system prompt) */
  cacheSystem?: boolean;
}

export async function* streamText(opts: StreamOpts) {
  const stream = anthropic.messages.stream({
    model: MODELS[opts.tier ?? 'REASONING'],
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    system: opts.cacheSystem
      ? [{ type: 'text', text: opts.system!, cache_control: { type: 'ephemeral' } }]
      : opts.system,
    messages: opts.messages,
  });

  for await (const evt of stream) {
    if (evt.type === 'content_block_delta' && evt.delta.type === 'text_delta') {
      yield evt.delta.text;
    }
  }

  // final usage for cost tracking
  const final = await stream.finalMessage();
  return {
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
    cacheCreationTokens: final.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: final.usage.cache_read_input_tokens ?? 0,
  };
}
```

## Step 5 — Tool-use (the senior pattern)

`src/lib/ai/tools.ts`:

```typescript
import type Anthropic from '@anthropic-ai/sdk';

export const tools: Anthropic.Tool[] = [
  {
    name: 'search_corpus',
    description: 'Semantic search over the user corpus. Returns top-k passages with citations.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        k: { type: 'number', description: 'Number of results (default 5, max 20).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'cite_claim',
    description: 'Mark a claim as supported by a specific source.',
    input_schema: {
      type: 'object',
      properties: {
        claimId: { type: 'string' },
        sourceUrl: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['claimId', 'sourceUrl', 'confidence'],
    },
  },
];

// Local handlers for each tool (the agent loop calls these)
export async function handleToolCall(name: string, input: any) {
  switch (name) {
    case 'search_corpus':
      return await searchCorpus(input.query, input.k ?? 5);
    case 'cite_claim':
      return await citeClaim(input.claimId, input.sourceUrl, input.confidence);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function searchCorpus(query: string, k: number) { /* pgvector retrieval */ return []; }
async function citeClaim(...args: any[]) { /* DB write */ return { ok: true }; }
```

## Step 6 — Agent loop with tool use

`src/lib/ai/agent.ts`:

```typescript
import { anthropic, MODELS } from './client';
import { tools, handleToolCall } from './tools';
import type Anthropic from '@anthropic-ai/sdk';

export async function runAgent({
  system,
  userPrompt,
  maxIterations = 10,
}: {
  system: string;
  userPrompt: string;
  maxIterations?: number;
}) {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];

  for (let i = 0; i < maxIterations; i++) {
    const response = await anthropic.messages.create({
      model: MODELS.REASONING,
      max_tokens: 4096,
      system,
      tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue;
        const result = await handleToolCall(block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: 'user', content: toolResults });
      continue;  // loop back for next agent step
    }

    // stop_reason === 'end_turn' → done
    return { messages, finalText: response.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n') };
  }

  throw new Error(`Agent exceeded ${maxIterations} iterations`);
}
```

## Step 7 — Structured output (Zod-typed)

```typescript
import { anthropic, MODELS } from './client';
import { z } from 'zod';

const ClaimSchema = z.object({
  claim: z.string(),
  confidence: z.number().min(0).max(1),
  category: z.enum(['factual', 'opinion', 'speculation']),
});

export async function classifyClaim(text: string) {
  const response = await anthropic.messages.create({
    model: MODELS.CHEAP,
    max_tokens: 512,
    system: 'You output JSON matching this schema: { claim: string, confidence: number, category: "factual"|"opinion"|"speculation" }. NO prose, just JSON.',
    messages: [{ role: 'user', content: `Classify: ${text}` }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
  return ClaimSchema.parse(JSON.parse(raw));
}
```

## Step 8 — Cost tracking (every call)

`src/lib/ai/cost.ts`:

```typescript
const PRICE_PER_MTOK = {
  'claude-sonnet-4-6':       { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheRead: 0.10, cacheWrite: 1.25 },
};

export function callCost({ model, inputTokens, outputTokens, cacheReadTokens = 0, cacheCreationTokens = 0 }) {
  const p = PRICE_PER_MTOK[model as keyof typeof PRICE_PER_MTOK];
  if (!p) return 0;
  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output +
    (cacheReadTokens / 1_000_000) * p.cacheRead +
    (cacheCreationTokens / 1_000_000) * p.cacheWrite
  );
}
```

After every agent run, store the cost in the `usage` table (from 04-billing-stripe.md).

## Step 9 — Prompt caching (90%+ cost reduction on stable prompts)

For any agent with a stable system prompt:

```typescript
const response = await anthropic.messages.create({
  model: MODELS.REASONING,
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: longStableSystemPrompt,  // 5k-50k tokens
      cache_control: { type: 'ephemeral' },  // 5-min cache, $0.30/Mtok read
    },
  ],
  messages: [{ role: 'user', content: shortUserMessage }],
});
```

After the first call, subsequent calls within 5 minutes hit cache at 1/10th cost.

## Senior callouts

- **Why two model tiers?** Cost discipline. Haiku for high-volume classification (≥10x cheaper); Sonnet for high-stakes reasoning. Routing rules in `lib/ai/route.ts` should be project-specific.
- **Why local tool handlers?** Lets you unit-test agent decisions without hitting the LLM. The agent decides WHAT to do; your handlers decide HOW.
- **Why structured output via JSON parsing instead of `tool_use`?** When the output IS the answer (not an action), JSON is cheaper and clearer. `tool_use` is for actions; JSON is for outputs.
- **Why prompt caching?** A 50k-token system prompt costs $0.15 per call uncached vs. $0.015 cached. At 1000 users × 10 calls/user/day = $1,500/day → $150/day. The diff is real.
- **Why iteration cap?** Runaway agents are a real failure mode; caps make cost knowable.
