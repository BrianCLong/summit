import { getRedisClient } from '../config/database.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import { cfg } from '../config.js';
import pino from 'pino';

const logger = pino();

export class CacheService {
  private metrics: PrometheusMetrics;
  private readonly namespace = 'cache';
  private defaultTtl: number;
  private enabled: boolean;

  constructor() {
    this.metrics = new PrometheusMetrics('cache_service');
    this.metrics.createCounter('ops_total', 'Total cache operations', ['operation', 'status']);
    this.defaultTtl = cfg.CACHE_TTL_DEFAULT;
    this.enabled = cfg.CACHE_ENABLED;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Get a value from cache.
   */
  async get<T>(key: string): Promise<T | null> {
    const redisClient = getRedisClient();
    if (!this.enabled || !redisClient) return null;

    try {
      const data = await redisClient.get(this.getKey(key));
      if (data) {
        this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'hit' });
        return JSON.parse(data) as T;
      }
      this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'miss' });
      return null;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache get error');
      this.metrics.incrementCounter('ops_total', { operation: 'get', status: 'error' });
      return null;
    }
  }

  /**
   * Set a value in cache.
   * @param ttl Seconds
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const redisClient = getRedisClient();
    if (!this.enabled || !redisClient) return;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTtl;
      await redisClient.setex(this.getKey(key), expiry, serialized);
      this.metrics.incrementCounter('ops_total', { operation: 'set', status: 'success' });
    } catch (error) {
      logger.error({ err: error, key }, 'Cache set error');
      this.metrics.incrementCounter('ops_total', { operation: 'set', status: 'error' });
    }
  }

  /**
   * Delete a value from cache.
   */
  async del(key: string): Promise<void> {
    const redisClient = getRedisClient();
    if (!this.enabled || !redisClient) return;
    try {
      await redisClient.del(this.getKey(key));
      this.metrics.incrementCounter('ops_total', { operation: 'del', status: 'success' });
    } catch (error) {
      logger.error({ err: error, key }, 'Cache del error');
    }
  }

  /**
   * Invalidate keys matching a pattern.
   * Note: SCAN is used to avoid blocking.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const redisClient = getRedisClient();
    if (!this.enabled || !redisClient) return;

    const fullPattern = this.getKey(pattern);
    const stream = redisClient.scanStream({
      match: fullPattern,
      count: 100
    });

    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        const pipeline = redisClient!.pipeline();
        keys.forEach(key => pipeline.del(key));
        pipeline.exec();
      }
    });

    stream.on('end', () => {
      logger.info({ pattern: fullPattern }, 'Cache pattern invalidated');
    });
  }

  /**
   * Helper to get or set a value.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const fresh = await factory();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  }
}

export const cacheService = new CacheService();
