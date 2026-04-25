import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const MODELS = {
  REASONING: 'claude-sonnet-4-6',
  CHEAP: 'claude-haiku-4-5-20251001',
} as const;

const PRICE_PER_MTOK = {
  'claude-sonnet-4-6': { in: 3, out: 15, cacheRead: 0.3 },
  'claude-haiku-4-5-20251001': { in: 1, out: 5, cacheRead: 0.1 },
} as const;

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
