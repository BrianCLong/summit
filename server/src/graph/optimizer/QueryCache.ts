// @ts-nocheck
import { QueryAnalysis, CacheStrategy, OptimizationContext } from './types.js';
import { getRedisClient } from '../../db/redis.js';
import { CompressionUtils } from '../../utils/compression.js';
import crypto from 'crypto';
import pino from 'pino';

const logger = (pino as any)();

export class QueryCache {
  private readonly cachePrefix = 'graph:query_result';
  private readonly defaultTTL = 300; // 5 minutes

  public generateStrategy(analysis: QueryAnalysis, context: OptimizationContext): CacheStrategy {
    if (analysis.isWrite) {
      return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
    }

    if (context.cacheEnabled === false) {
       return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
    }

    let ttl = this.defaultTTL;
    if (analysis.complexity < 10) ttl = 1800; // 30 mins
    if (analysis.aggregationCount > 0) ttl = 600; // 10 mins

    const keyPattern = `${this.cachePrefix}:${context.tenantId}:${context.queryType}`;
    const invalidationRules = analysis.affectedLabels.map(l => `${l}:*`);

    return {
      enabled: true,
      ttl,
      keyPattern,
      invalidationRules,
      partitionKeys: ['tenantId']
    };
  }

  public async get(key: string): Promise<unknown | null> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);
      if (cached) {
        return CompressionUtils.decompressFromString(cached);
      }
    } catch (error: any) {
      logger.warn('Cache read failed', error);
    }
    return null;
  }

  public async set(key: string, value: unknown, ttl: number): Promise<void> {
    try {
      const redis = getRedisClient();
      const compressed = await CompressionUtils.compressToString(value);
      await redis.set(key, compressed, 'EX', ttl);
    } catch (error: any) {
      logger.warn('Cache write failed', error);
    }
  }

  public generateKey(query: string, params: Record<string, unknown>, context: OptimizationContext): string {
    const hash = crypto.createHash('sha256')
      .update(query + JSON.stringify(params))
      .digest('hex');
    return `${this.cachePrefix}:${context.tenantId}:${hash}`;
  }

  public async invalidate(tenantId: string, labels: string[]): Promise<void> {
      const redis = getRedisClient();
      const pattern = `${this.cachePrefix}:${tenantId}:*`;
      const stream = redis.scanStream({ match: pattern, count: 100 });
      stream.on('data', (keys) => {
          if (keys.length) redis.del(...keys);
      });
  }
}
