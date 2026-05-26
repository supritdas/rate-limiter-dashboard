import { redisClient } from "../config/redis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp (ms)
  retryAfter?: number; // seconds
}

// ─── Fixed Window Counter ────────────────────────────────────────────────────
export async function fixedWindowRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const key = `rl:fixed:${identifier}:${windowStart}`;

  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, windowSeconds + 1);
  }

  const resetAt = (windowStart + windowSeconds) * 1000;
  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;

  return {
    allowed,
    limit,
    remaining,
    resetAt,
    retryAfter: allowed ? undefined : windowStart + windowSeconds - now,
  };
}

// ─── Sliding Window Log (Redis sorted set) ───────────────────────────────────
export async function slidingWindowRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const key = `rl:sliding:${identifier}`;

  // Lua script for atomicity
  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window_start = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local window_ms = tonumber(ARGV[4])

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

    -- Count current requests
    local count = redis.call('ZCARD', key)

    if count < limit then
      -- Add current request
      redis.call('ZADD', key, now, now .. '-' .. math.random(1, 1000000))
      redis.call('PEXPIRE', key, window_ms + 1000)
      return {1, count + 1}
    else
      return {0, count}
    end
  `;

  const result = await redisClient.eval(luaScript, {
    keys: [key],
    arguments: [
      now.toString(),
      windowStart.toString(),
      limit.toString(),
      windowMs.toString(),
    ],
  }) as number[];

  const allowed = result[0] === 1;
  const count = result[1];
  const remaining = Math.max(0, limit - count);

  return {
    allowed,
    limit,
    remaining,
    resetAt: now + windowMs,
    retryAfter: allowed ? undefined : Math.ceil(windowSeconds - (now - windowStart) / 1000),
  };
}

// ─── Unified entry point ─────────────────────────────────────────────────────
export async function checkRateLimit(
  apiKeyId: string,
  algorithm: "fixed" | "sliding",
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (algorithm === "sliding") {
    return slidingWindowRateLimit(apiKeyId, limit, windowSeconds);
  }
  return fixedWindowRateLimit(apiKeyId, limit, windowSeconds);
}
