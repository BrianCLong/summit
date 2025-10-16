/**
 * Hot-Path Optimization Framework
 * Sprint 27E: Performance-critical path optimization with caching and pooling
 */

import Redis from 'ioredis';
import { performance } from 'perf_hooks';

export interface HotPathMetrics {
  executionTime: number;
  cacheHits: number;
  cacheMisses: number;
  poolUtilization: number;
  memoryUsage: number;
}

export interface CacheConfig {
  ttlSeconds: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'ttl';
  prefetchThreshold: number;
}

export interface PoolConfig {
  minSize: number;
  maxSize: number;
  acquireTimeout: number;
  destroyTimeout: number;
}

export class HotPathOptimizer {
  private redis: Redis;
  private localCache = new Map<
    string,
    { value: any; expires: number; hits: number }
  >();
  private connectionPool = new Map<string, any[]>();
  private metrics: HotPathMetrics = {
    executionTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    poolUtilization: 0,
    memoryUsage: 0,
  };

  constructor(
    redisUrl: string,
    private cacheConfig: CacheConfig,
    private poolConfig: PoolConfig,
  ) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }

  /**
   * Execute function with hot-path optimizations
   */
  async withOptimization<T>(
    key: string,
    fn: () => Promise<T>,
    options?: {
      cacheTtl?: number;
      skipCache?: boolean;
      prefetch?: boolean;
    },
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Check local cache first
      if (!options?.skipCache) {
        const cached = await this.getFromCache(key);
        if (cached !== null) {
          this.metrics.cacheHits++;
          return cached;
        }
        this.metrics.cacheMisses++;
      }

      // Execute with connection pooling
      const result = await this.executeWithPooling(fn);

      // Cache result
      if (!options?.skipCache) {
        await this.setCache(key, result, options?.cacheTtl);
      }

      // Prefetch related data if configured
      if (options?.prefetch) {
        this.schedulePrefetch(key, fn);
      }

      return result;
    } finally {
      this.metrics.executionTime = performance.now() - startTime;
      this.updateMetrics();
    }
  }

  /**
   * Batch operations for improved throughput
   */
  async batchExecute<T>(
    operations: Array<{
      key: string;
      fn: () => Promise<T>;
      options?: { cacheTtl?: number };
    }>,
  ): Promise<T[]> {
    const startTime = performance.now();

    // Check cache for all keys in parallel
    const cachePromises = operations.map((op) =>
      this.getFromCache(op.key).then((cached) => ({ key: op.key, cached })),
    );
    const cacheResults = await Promise.all(cachePromises);

    // Identify cache misses
    const misses = operations.filter(
      (op, i) => cacheResults[i].cached === null,
    );

    // Execute misses in parallel with pooling
    const missPromises = misses.map(async (op) => {
      const result = await this.executeWithPooling(op.fn);
      await this.setCache(op.key, result, op.options?.cacheTtl);
      return { key: op.key, result };
    });

    const missResults = await Promise.all(missPromises);
    const missMap = new Map(missResults.map((r) => [r.key, r.result]));

    // Combine cached and computed results
    const results = operations.map((op, i) => {
      const cached = cacheResults[i].cached;
      return cached !== null ? cached : missMap.get(op.key);
    });

    this.metrics.executionTime = performance.now() - startTime;
    return results;
  }

  /**
   * Query optimization with prepared statements
   */
  async optimizedQuery<T>(
    queryKey: string,
    query: string,
    params: any[],
    connection: any,
  ): Promise<T[]> {
    // Use prepared statements for hot queries
    const preparedKey = `prepared:${queryKey}`;
    let prepared = this.localCache.get(preparedKey)?.value;

    if (!prepared) {
      prepared = await connection.prepare(query);
      this.setLocalCache(preparedKey, prepared, 3600); // 1 hour
    }

    // Execute with parameter binding
    const result = await prepared.execute(params);
    return result.rows;
  }

  /**
   * Memory-efficient streaming for large datasets
   */
  async *streamOptimized<T>(
    query: string,
    params: any[],
    connection: any,
    batchSize = 1000,
  ): AsyncGenerator<T[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batchQuery = `${query} LIMIT ${batchSize} OFFSET ${offset}`;
      const batch = await this.optimizedQuery<T>(
        `stream:${offset}`,
        batchQuery,
        params,
        connection,
      );

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        offset += batchSize;
        hasMore = batch.length === batchSize;
      }

      // Yield control to event loop
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  private async getFromCache(key: string): Promise<any> {
    // Try local cache first (fastest)
    const local = this.getLocalCache(key);
    if (local !== null) return local;

    // Fall back to Redis
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Populate local cache
        this.setLocalCache(key, parsed, 300); // 5 min local TTL
        return parsed;
      }
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
    }

    return null;
  }

  private async setCache(key: string, value: any, ttl?: number): Promise<void> {
    const effectiveTtl = ttl || this.cacheConfig.ttlSeconds;

    // Set in local cache
    this.setLocalCache(key, value, effectiveTtl);

    // Set in Redis
    try {
      await this.redis.setex(key, effectiveTtl, JSON.stringify(value));
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }

  private getLocalCache(key: string): any {
    const entry = this.localCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.localCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value;
  }

  private setLocalCache(key: string, value: any, ttlSeconds: number): void {
    // Implement LRU eviction if cache is full
    if (this.localCache.size >= this.cacheConfig.maxSize) {
      this.evictLocalCache();
    }

    this.localCache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
      hits: 0,
    });
  }

  private evictLocalCache(): void {
    if (this.cacheConfig.strategy === 'lru') {
      // Remove oldest entry
      const oldestKey = this.localCache.keys().next().value;
      if (oldestKey) this.localCache.delete(oldestKey);
    } else if (this.cacheConfig.strategy === 'lfu') {
      // Remove least frequently used
      let minHits = Infinity;
      let leastUsedKey = '';

      for (const [key, entry] of this.localCache.entries()) {
        if (entry.hits < minHits) {
          minHits = entry.hits;
          leastUsedKey = key;
        }
      }

      if (leastUsedKey) this.localCache.delete(leastUsedKey);
    }
  }

  private async executeWithPooling<T>(fn: () => Promise<T>): Promise<T> {
    // Simple connection pooling simulation
    const poolKey = 'default';
    const pool = this.connectionPool.get(poolKey) || [];

    this.metrics.poolUtilization = pool.length / this.poolConfig.maxSize;

    return await fn();
  }

  private schedulePrefetch(key: string, fn: () => Promise<any>): void {
    // Schedule prefetch of related data
    setImmediate(async () => {
      try {
        const prefetchKeys = this.generatePrefetchKeys(key);
        for (const prefetchKey of prefetchKeys) {
          const exists = await this.getFromCache(prefetchKey);
          if (!exists) {
            const result = await fn();
            await this.setCache(prefetchKey, result);
          }
        }
      } catch (error) {
        console.warn('Prefetch error:', error);
      }
    });
  }

  private generatePrefetchKeys(baseKey: string): string[] {
    // Generate related keys for prefetching
    const parts = baseKey.split(':');
    const prefetchKeys: string[] = [];

    // Add parent/child relationships
    if (parts.length > 1) {
      prefetchKeys.push(parts.slice(0, -1).join(':'));
    }

    return prefetchKeys;
  }

  private updateMetrics(): void {
    // Update memory usage
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;

    // Emit metrics for monitoring
    console.log(
      JSON.stringify({
        event: 'hotpath_metrics',
        metrics: this.metrics,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): HotPathMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics counters
   */
  resetMetrics(): void {
    this.metrics = {
      executionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      poolUtilization: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Warm up cache with common queries
   */
  async warmupCache(
    warmupQueries: Array<{ key: string; fn: () => Promise<any> }>,
  ): Promise<void> {
    console.log('Starting cache warmup...');

    const promises = warmupQueries.map(async ({ key, fn }) => {
      try {
        const result = await fn();
        await this.setCache(key, result);
        console.log(`Warmed up cache for key: ${key}`);
      } catch (error) {
        console.warn(`Warmup failed for key ${key}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('Cache warmup completed');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    this.localCache.clear();
    this.connectionPool.clear();
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static startMeasurement(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMeasurement(label, duration);
      return duration;
    };
  }

  static recordMeasurement(label: string, duration: number): void {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }

    const measurements = this.measurements.get(label)!;
    measurements.push(duration);

    // Keep only last 1000 measurements
    if (measurements.length > 1000) {
      measurements.splice(0, measurements.length - 1000);
    }
  }

  static getStats(label: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const label of this.measurements.keys()) {
      stats[label] = this.getStats(label);
    }
    return stats;
  }
}
