import { getRedisClient } from '../config/database.js';

export class RedisCache {
  private redis;

  constructor() {
    const redisDisabled = process.env.REDIS_DISABLE === '1';
    this.redis = redisDisabled ? null : getRedisClient();
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    if (!this.redis) return [];
    try {
      return await this.redis.keys(pattern);
    } catch {
      // Log to a proper logger in a real application
      return [];
    }
  }

  async get(key: string): Promise<unknown> {
    if (!this.redis) return null;
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      // Log to a proper logger in a real application
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), { EX: ttl });
    } catch {
      // Log to a proper logger in a real application
    }
  }
}
