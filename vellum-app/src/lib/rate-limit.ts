/**
 * Tiny in-memory token-bucket rate limiter for v1.
 * Per-process, per-key. Resets when the process restarts.
 *
 * Adequate for portfolio-scale traffic and bot-flood deterrence on
 * anonymous endpoints (subscribe, public API). For real production —
 * multi-instance, persistent — swap to Redis / Upstash with the same
 * `rateLimit(key, opts)` signature.
 */

interface Bucket {
  /** how many tokens have been spent inside the current window */
  spent: number;
  /** the timestamp when the current window started */
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Cap memory: drop entries we haven't seen in a while.
 * Cheap LRU substitute — runs at most every 1000 calls.
 */
let pruneCounter = 0;
function maybePrune() {
  pruneCounter++;
  if (pruneCounter < 1000) return;
  pruneCounter = 0;
  const cutoff = Date.now() - 60 * 60 * 1000; // 1h
  for (const [k, b] of buckets) {
    if (b.windowStart < cutoff) buckets.delete(k);
  }
}

interface Options {
  /** how many requests are allowed per window */
  tokens: number;
  /** window length in milliseconds */
  windowMs: number;
}

interface Result {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function rateLimit(key: string, opts: Options): Result {
  maybePrune();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= opts.windowMs) {
    buckets.set(key, { spent: 1, windowStart: now });
    return { allowed: true, remaining: opts.tokens - 1, resetMs: opts.windowMs };
  }

  if (existing.spent >= opts.tokens) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: opts.windowMs - (now - existing.windowStart),
    };
  }

  existing.spent += 1;
  return {
    allowed: true,
    remaining: opts.tokens - existing.spent,
    resetMs: opts.windowMs - (now - existing.windowStart),
  };
}
