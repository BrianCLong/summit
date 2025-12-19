import { QueryAnalysis, CacheStrategy, OptimizationContext } from './types.js';
import { getRedisClient } from '../../db/redis.js';
import { CompressionUtils } from '../../utils/compression.js';
import crypto from 'crypto';
import pino from 'pino';

// @ts-ignore
const logger = pino.default ? pino.default() : pino();

export class QueryCache {
  private readonly cachePrefix = 'graph:query_result';
  private readonly hitCountPrefix = 'graph:query_hits';
  private readonly defaultTTL = 300; // 5 minutes

  /**
   * Generates an adaptive cache strategy based on query complexity and historical usage.
   */
  public generateStrategy(analysis: QueryAnalysis, context: OptimizationContext): CacheStrategy {
    if (analysis.isWrite) {
      return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
    }

    if (context.cacheEnabled === false) {
       return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
    }

    let ttl = this.defaultTTL;

    // Adaptive TTL: Higher complexity queries get longer TTL
    if (analysis.complexity > 50) ttl = 3600; // 1 hour
    else if (analysis.complexity > 10) ttl = 1800; // 30 mins

    // Aggregations change less frequently usually
    if (analysis.aggregationCount > 0) ttl = Math.max(ttl, 600);

    const keyPattern = `${this.cachePrefix}:${context.tenantId}:${context.queryType}`;
    const invalidationRules = analysis.affectedLabels.map(l => `${l}:*`);

    return {
      enabled: true,
      ttl,
      keyPattern,
      invalidationRules,
      partitionKeys: ['tenantId'],
      staleWhileRevalidate: true // Enable SWR for better perceived performance
    };
  }

  public async get(key: string): Promise<any | null> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);
      if (cached) {
        // Increment hit count asynchronously
        this.incrementHitCount(key).catch(err => logger.error('Failed to increment hit count', err));
        return CompressionUtils.decompressFromString(cached);
      }
    } catch (error) {
      logger.warn('Cache read failed', error);
    }
    return null;
  }

  public async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const redis = getRedisClient();
      const compressed = await CompressionUtils.compressToString(value);

      // Adjust TTL based on popularity?
      // For now, stick to the plan's TTL, but we could check hit counts here.

      await redis.set(key, compressed, 'EX', ttl);
    } catch (error) {
      logger.warn('Cache write failed', error);
    }
  }

  public generateKey(query: string, params: any, context: OptimizationContext): string {
    const hash = crypto.createHash('sha256')
      .update(query + JSON.stringify(params))
      .digest('hex');
    return `${this.cachePrefix}:${context.tenantId}:${hash}`;
  }

  public async invalidate(tenantId: string, labels: string[]): Promise<void> {
      const redis = getRedisClient();
      const pattern = `${this.cachePrefix}:${tenantId}:*`; // Simplified invalidation for now
      // Ideally we would index keys by label to allow targeted invalidation
      // For now, this invalidates everything for the tenant if we match the pattern,
      // which is aggressive but safe.
      // A better approach requires a secondary index in Redis: Label -> Set of QueryKeys.

      // Keeping the existing scan implementation for now
      const stream = redis.scanStream({ match: pattern, count: 100 });
      stream.on('data', (keys) => {
          if (keys.length) redis.del(...keys);
      });
  }

  private async incrementHitCount(key: string): Promise<void> {
      const redis = getRedisClient();
      // Use a separate key for tracking hits to avoid affecting the data key
      const hitKey = `${this.hitCountPrefix}:${key}`;
      await redis.incr(hitKey);
      await redis.expire(hitKey, 86400); // Reset stats daily
  }

  public async getHitCount(key: string): Promise<number> {
      const redis = getRedisClient();
      const hitKey = `${this.hitCountPrefix}:${key}`;
      const count = await redis.get(hitKey);
      return count ? parseInt(count, 10) : 0;
  }
}
