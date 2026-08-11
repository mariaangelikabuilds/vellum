import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const MODELS = {
  REASONING: 'claude-sonnet-5',
  CHEAP: 'claude-haiku-4-5-20251001',
} as const;

// Sonnet 5 rejects temperature/top_p/top_k with a 400, and its tokenizer emits
// roughly 30% more tokens for the same text, so spend rises at unchanged rates.
// Haiku 4.5 stays: there is no Haiku 5 and it is still the fastest model.
const PRICE_PER_MTOK = {
  'claude-sonnet-5': { in: 3, out: 15, cacheRead: 0.3 },
  'claude-sonnet-4-6': { in: 3, out: 15, cacheRead: 0.3 },
  'claude-haiku-4-5-20251001': { in: 1, out: 5, cacheRead: 0.1 },
} as const;

// Prompt caching has a per-model floor: 1,024 tokens on Sonnet, 4,096 on Haiku.
// A system block under the floor caches nothing and reports zero for both cache
// fields, silently, while still paying the 1.25x write multiplier. Agents call
// this before setting cache_control so the hot path stops paying for a no-op.
export function shouldCacheSystem(model: string, systemText: string): boolean {
  const floor = model.startsWith('claude-haiku') ? 4096 : 1024;
  return systemText.length / 4 >= floor;
}

export function callCostCents({
  model,
  inputTokens,
  outputTokens,
  cacheReadTokens = 0,
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
}): number {
  const p = PRICE_PER_MTOK[model as keyof typeof PRICE_PER_MTOK];
  if (!p) return 0;
  return Math.ceil(
    ((inputTokens / 1_000_000) * p.in +
      (outputTokens / 1_000_000) * p.out +
      (cacheReadTokens / 1_000_000) * p.cacheRead) *
      100,
  );
}
