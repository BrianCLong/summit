import { createClient, RedisClientType } from 'redis';
import { Limit } from './plans';

// This module provides quota checking using Redis for rate limiting and daily/monthly caps.

let redisClient: RedisClientType;

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

export const budgeter = {
  /**
   * Checks if a tenant has exceeded a hard limit for a given feature.
   * Uses Redis for fast, distributed counters.
   * @returns {Promise<boolean>} - True if the limit is exceeded, false otherwise.
   */
  async isHardLimited(tenantId: string, feature: string, limits: Limit): Promise<boolean> {
    const r = await getRedisClient();
    const now = new Date();

    // 1. Check rate limit (per minute, token bucket)
    if (limits.ratePerMin) {
      const key = `rl:${tenantId}:${feature}:${Math.floor(now.getTime() / 60000)}`; // Per-minute key
      const currentCount = await r.incr(key);
      if (currentCount === 1) {
        // Set expiry for the first request in this window
        await r.expire(key, 90); // Expire slightly longer than the window
      }
      if (currentCount > limits.ratePerMin) {
        return true; // Rate limit exceeded
      }
    }

    // 2. Check daily limit
    if (limits.daily) {
        const key = `dl:${tenantId}:${feature}:${now.toISOString().slice(0, 10)}`; // YYYY-MM-DD key
        const currentCount = await r.incr(key);
        if (currentCount > limits.daily) {
            return true;
        }
    }

    // 3. Check monthly limit
    if (limits.monthly) {
        const key = `ml:${tenantId}:${feature}:${now.toISOString().slice(0, 7)}`; // YYYY-MM key
        const currentCount = await r.incr(key);
        if (currentCount > limits.monthly) {
            return true;
        }
    }

    return false;
  },

  /**
   * Checks if usage is approaching a limit and should trigger a warning.
   * @returns {Promise<void>} 
   */
  async maybeWarn(tenantId: string, feature: string, limits: Limit): Promise<void> {
    // TODO: Implement logic to check if usage is at ~80% of daily/monthly limit
    // and emit a toast notification to the UI via a separate channel if it is.
  }
};
