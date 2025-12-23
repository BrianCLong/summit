// @ts-nocheck
import { CacheClient, createCacheClient } from '@packages/cache';
import pino from 'pino';
import type { CitizenProfile } from '../schemas/citizen.js';

const logger = pino({ name: 'citizen-cache' });

/**
 * Redis-based caching for citizen data
 * Improves performance for frequently accessed profiles
 */
export class CacheService {
  private cache: CacheClient;
  private readonly prefix = 'citizen:';
  private readonly defaultTTL = 3600; // 1 hour

  constructor(
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {
    this.cache = createCacheClient({
      redisUrl: this.redisUrl,
      namespace: 'citizen-service',
      cacheClass: 'critical_path',
      defaultTTLSeconds: this.defaultTTL,
      logger,
    });
  }

  async connect(): Promise<void> {
    if (process.env.CACHE_DISABLED === 'true') {
      logger.warn('Cache disabled via env switch');
      return;
    }

    const healthy = await this.cache.ping();
    if (!healthy) {
      logger.warn('Redis connection failed, running with in-memory cache');
    } else {
      logger.info('Connected to cache backend');
    }
  }

  async disconnect(): Promise<void> {
    await this.cache.close();
  }

  async getCitizen(id: string): Promise<CitizenProfile | null> {
    const cached = await this.cache.get<string>(`${this.prefix}${id}`);
    if (!cached) return null;

    try {
      return typeof cached === 'string' ? (JSON.parse(cached) as CitizenProfile) : (cached as CitizenProfile);
    } catch (error) {
      logger.warn({ error, id }, 'Cache parse failed');
      return null;
    }
  }

  async setCitizen(citizen: CitizenProfile, ttl: number = this.defaultTTL): Promise<void> {
    await this.cache.set(`${this.prefix}${citizen.id}`, citizen, {
      ttlSeconds: ttl,
      cacheClass: 'critical_path',
      namespace: 'citizen-service',
    });
    await this.cache.set(`${this.prefix}national:${citizen.nationalId}`, citizen.id, {
      ttlSeconds: ttl,
      cacheClass: 'critical_path',
      namespace: 'citizen-service',
    });
    logger.debug({ id: citizen.id }, 'Cached citizen');
  }

  async invalidate(id: string): Promise<void> {
    await this.cache.delete(`${this.prefix}${id}`, {
      cacheClass: 'critical_path',
      namespace: 'citizen-service',
    });
    logger.debug({ id }, 'Cache invalidated');
  }

  async getByNationalId(nationalId: string): Promise<string | null> {
    return this.cache.get<string>(`${this.prefix}national:${nationalId}`);
  }

  async healthCheck(): Promise<{ status: 'pass' | 'fail'; latency: number }> {
    const start = Date.now();
    const healthy = await this.cache.ping();

    return { status: healthy ? 'pass' : 'fail', latency: Date.now() - start };
  }

  isConnected(): boolean {
    return this.cache.isRedisConnected();
  }
}

export const cacheService = new CacheService();
