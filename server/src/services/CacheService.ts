import { getRedisClient } from '../db/redis.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'CacheService' });

export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Tries to get value from cache. If missing, calls fetcher(), caches result, and returns it.
   * Handles cache failures gracefully by returning fetcher result.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const client = getRedisClient();

    try {
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error, key }, 'Redis get failed, falling back to fetcher');
    }

    const value = await fetcher();

    try {
      if (value !== undefined && value !== null) {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      }
    } catch (error) {
      logger.warn({ error, key }, 'Redis set failed');
    }

    return value;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      logger.error({ err, key }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const client = getRedisClient();
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.error({ err, key }, 'Cache set error');
    }
  }

  async del(key: string): Promise<void> {
      const client = getRedisClient();
      try {
          await client.del(key);
      } catch (err) {
          logger.error({ err, key }, 'Cache del error');
      }
  }

  /**
   * Invalidates keys matching a pattern using SCAN.
   * Warning: Can be slow on very large datasets.
   */
  async invalidatePattern(pattern: string): Promise<void> {
      const client = getRedisClient();
      try {
          const stream = client.scanStream({ match: pattern, count: 100 });
          for await (const keys of stream) {
              if (keys.length > 0) {
                  await client.del(...keys);
              }
          }
      } catch (err) {
          logger.error({ err, pattern }, 'Cache invalidatePattern error');
      }
  }
}

export const cacheService = CacheService.getInstance();
