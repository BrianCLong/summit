import Redis from 'ioredis';
import pino from 'pino';
import type { CitizenProfile } from '../schemas/citizen.js';

const logger = pino({ name: 'citizen-cache' });

/**
 * Redis-based caching for citizen data
 * Improves performance for frequently accessed profiles
 */
export class CacheService {
  private redis: Redis | null = null;
  private readonly prefix = 'citizen:';
  private readonly defaultTTL = 3600; // 1 hour

  constructor(
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {}

  async connect(): Promise<void> {
    try {
      this.redis = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.redis.connect();
      logger.info('Connected to Redis cache');
    } catch (error) {
      logger.warn({ error }, 'Redis connection failed, running without cache');
      this.redis = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  async getCitizen(id: string): Promise<CitizenProfile | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(`${this.prefix}${id}`);
      if (data) {
        logger.debug({ id }, 'Cache hit for citizen');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.warn({ error, id }, 'Cache get failed');
      return null;
    }
  }

  async setCitizen(citizen: CitizenProfile, ttl: number = this.defaultTTL): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(
        `${this.prefix}${citizen.id}`,
        ttl,
        JSON.stringify(citizen)
      );
      // Also index by nationalId
      await this.redis.setex(
        `${this.prefix}national:${citizen.nationalId}`,
        ttl,
        citizen.id
      );
      logger.debug({ id: citizen.id }, 'Cached citizen');
    } catch (error) {
      logger.warn({ error, id: citizen.id }, 'Cache set failed');
    }
  }

  async invalidate(id: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(`${this.prefix}${id}`);
      logger.debug({ id }, 'Cache invalidated');
    } catch (error) {
      logger.warn({ error, id }, 'Cache invalidation failed');
    }
  }

  async getByNationalId(nationalId: string): Promise<string | null> {
    if (!this.redis) return null;

    try {
      return await this.redis.get(`${this.prefix}national:${nationalId}`);
    } catch (error) {
      logger.warn({ error, nationalId }, 'Cache lookup failed');
      return null;
    }
  }

  async healthCheck(): Promise<{ status: 'pass' | 'fail'; latency: number }> {
    if (!this.redis) {
      return { status: 'fail', latency: 0 };
    }

    const start = Date.now();
    try {
      await this.redis.ping();
      return { status: 'pass', latency: Date.now() - start };
    } catch {
      return { status: 'fail', latency: Date.now() - start };
    }
  }

  isConnected(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }
}

export const cacheService = new CacheService();
