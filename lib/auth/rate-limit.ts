// lib/auth/rate-limit.ts — Rate limiting for auth and sensitive endpoints
// In-memory sliding window rate limiter (per RULES.md Security Rules).
// Protects login endpoints against brute force attacks.

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * Checks and updates rate limit for a given identifier (e.g. IP + endpoint).
 * Default: 5 attempts per 15 minutes for auth endpoints.
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  if (!existing || now > existing.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: new Date(newRecord.resetAt),
    };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    resetAt: new Date(existing.resetAt),
  };
}

/**
 * Resets rate limit for an identifier (e.g. upon successful login).
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
