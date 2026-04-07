/**
 * Simple in-process sliding-window rate limiter.
 * Suitable for single-instance deployments (Vercel hobby / small scale).
 * For multi-instance, replace with an Upstash Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Returns true if the request should be blocked.
 * @param key      Unique identifier (e.g. workspaceId + route)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) return true;

  entry.count += 1;
  return false;
}

// Prune stale entries every 10 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      store.forEach((entry, key) => {
        if (now > entry.resetAt) store.delete(key);
      });
    },
    10 * 60 * 1000,
  );
}
