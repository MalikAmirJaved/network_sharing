interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitGlobal {
  __networdRateLimits?: Map<string, Bucket>;
}

const globalStore = globalThis as unknown as RateLimitGlobal;

function buckets(): Map<string, Bucket> {
  return (globalStore.__networdRateLimits ??= new Map());
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * In-process fixed-window limiter. Good for a single-node LAN deployment;
 * swap for Redis when running multiple instances (see docs/ARCHITECTURE.md).
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const store = buckets();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

export function cleanupRateLimits(): void {
  const store = buckets();
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}
