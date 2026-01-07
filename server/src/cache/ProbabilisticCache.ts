import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import logger from '../utils/logger.js';

/**
 * Probabilistic Cache Service
 *
 * Implements probabilistic data structures on top of Redis:
 * - Bloom Filters: For efficient set membership testing (prevention of cache penetration).
 * - HyperLogLog: For cardinality estimation (unique counters).
 */
export class ProbabilisticCache {
  private redis: Redis;
  private readonly defaultErrorRate = 0.01;
  private readonly defaultCapacity = 1000000;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // ============================================================================
  // Bloom Filter Implementation (Client-side simulation or RedisBloom if avail)
  // ============================================================================
  // Since we can't guarantee RedisBloom module is installed, we implement a
  // basic client-side Bloom Filter using Redis Bitmaps.

  /**
   * Add an item to a Bloom Filter
   * @param filterName Name of the filter
   * @param item Item to add
   * @param options Capacity and error rate configuration
   */
  async bloomAdd(
    filterName: string,
    item: string,
    options: { capacity?: number; errorRate?: number; ttlSeconds?: number } = {}
  ): Promise<void> {
    const capacity = options.capacity || this.defaultCapacity;
    const errorRate = options.errorRate || this.defaultErrorRate;

    // Calculate optimal bit array size (m) and hash functions (k)
    // m = - (n * ln(p)) / (ln(2)^2)
    // k = (m / n) * ln(2)
    const m = Math.ceil(-(capacity * Math.log(errorRate)) / (Math.log(2) ** 2));
    const k = Math.round((m / capacity) * Math.log(2));

    const pipeline = this.redis.pipeline();
    const key = `bloom:${filterName}`;

    // Generate k hash values
    for (let i = 0; i < k; i++) {
      const offset = this.getHash(item, i, m);
      pipeline.setbit(key, offset, 1);
    }

    if (options.ttlSeconds) {
      pipeline.expire(key, options.ttlSeconds);
    }

    try {
      await pipeline.exec();
    } catch (error: any) {
      logger.error({ error, filterName }, 'Failed to add to bloom filter');
    }
  }

  /**
   * Check if an item exists in the Bloom Filter
   * Returns true if "possibly in set", false if "definitely not in set".
   */
  async bloomExists(filterName: string, item: string, options: { capacity?: number; errorRate?: number } = {}): Promise<boolean> {
    const capacity = options.capacity || this.defaultCapacity;
    const errorRate = options.errorRate || this.defaultErrorRate;

    const m = Math.ceil(-(capacity * Math.log(errorRate)) / (Math.log(2) ** 2));
    const k = Math.round((m / capacity) * Math.log(2));

    const pipeline = this.redis.pipeline();
    const key = `bloom:${filterName}`;

    for (let i = 0; i < k; i++) {
      const offset = this.getHash(item, i, m);
      pipeline.getbit(key, offset);
    }

    try {
      const results = await pipeline.exec();
      if (!results) return false;

      // If any bit is 0, the item is definitely not in the set
      for (const [err, bit] of results) {
        if (err || bit === 0) return false;
      }
      return true; // Possibly in set
    } catch (error: any) {
      logger.error({ error, filterName }, 'Failed to check bloom filter');
      return true; // Fail safe: assume it might exist to force DB check
    }
  }

  // ============================================================================
  // HyperLogLog Implementation (Native Redis)
  // ============================================================================

  /**
   * Add elements to a HyperLogLog structure
   */
  async hllAdd(key: string, ...elements: string[]): Promise<boolean> {
    if (elements.length === 0) return false;
    try {
      const result = await this.redis.pfadd(`hll:${key}`, ...elements);
      return result === 1;
    } catch (error: any) {
      logger.error({ error, key }, 'Failed to add to HLL');
      return false;
    }
  }

  /**
   * Count unique elements in a HyperLogLog structure
   */
  async hllCount(key: string): Promise<number> {
    try {
      return await this.redis.pfcount(`hll:${key}`);
    } catch (error: any) {
      logger.error({ error, key }, 'Failed to count HLL');
      return 0;
    }
  }

  /**
   * Merge multiple HLL structures into a destination
   */
  async hllMerge(destKey: string, ...sourceKeys: string[]): Promise<void> {
    try {
      await this.redis.pfmerge(`hll:${destKey}`, ...sourceKeys.map(k => `hll:${k}`));
    } catch (error: any) {
      logger.error({ error, destKey }, 'Failed to merge HLL');
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getHash(item: string, seed: number, max: number): number {
    const hash = createHash('sha256')
      .update(`${item}:${seed}`)
      .digest('hex');
    // Convert first 8 bytes to integer and mod max
    return parseInt(hash.substring(0, 8), 16) % max;
  }
}
