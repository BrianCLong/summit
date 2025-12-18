import { CacheConfigSchema, type CacheConfig, type CacheStats, type CacheMetrics } from './types.js';
import { CacheClient } from './cache-client.js';
import { MemoryProvider } from './providers/memory.js';
import { RedisProvider } from './providers/redis.js';

/**
 * Default metrics implementation
 */
class DefaultMetrics implements CacheMetrics {
  private hits = 0;
  private misses = 0;
  private localHits = 0;
  private redisHits = 0;
  private getLatencies: number[] = [];
  private setLatencies: number[] = [];

  recordHit(source: 'local' | 'redis'): void {
    this.hits++;
    if (source === 'local') {
      this.localHits++;
    } else {
      this.redisHits++;
    }
  }

  recordMiss(): void {
    this.misses++;
  }

  recordGetLatency(ms: number): void {
    this.getLatencies.push(ms);
    if (this.getLatencies.length > 1000) {
      this.getLatencies.shift();
    }
  }

  recordSetLatency(ms: number): void {
    this.setLatencies.push(ms);
    if (this.setLatencies.length > 1000) {
      this.setLatencies.shift();
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const avgGet = this.getLatencies.length > 0
      ? this.getLatencies.reduce((a, b) => a + b, 0) / this.getLatencies.length
      : 0;
    const avgSet = this.setLatencies.length > 0
      ? this.setLatencies.reduce((a, b) => a + b, 0) / this.setLatencies.length
      : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      localHits: this.localHits,
      redisHits: this.redisHits,
      localSize: 0, // Updated by provider
      redisKeys: 0, // Updated by provider
      avgGetLatency: avgGet,
      avgSetLatency: avgSet,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.localHits = 0;
    this.redisHits = 0;
    this.getLatencies = [];
    this.setLatencies = [];
  }
}

/**
 * Cache manager for creating and managing cache clients
 */
export class CacheManager {
  private config: CacheConfig;
  private client: CacheClient | null = null;
  private metrics: CacheMetrics;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = CacheConfigSchema.parse(config);
    this.metrics = new DefaultMetrics();
  }

  /**
   * Get or create cache client
   */
  async getClient(): Promise<CacheClient> {
    if (this.client) {
      return this.client;
    }

    let localProvider = null;
    let redisProvider = null;

    // Initialize local cache
    if (this.config.local.enabled) {
      localProvider = new MemoryProvider({
        maxSize: this.config.local.maxSize,
        ttl: this.config.local.ttl * 1000,
      });
    }

    // Initialize Redis
    if (this.config.redis.enabled) {
      redisProvider = new RedisProvider({
        url: this.config.redis.url,
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,
        keyPrefix: this.config.redis.keyPrefix,
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      });

      // Check Redis availability
      const available = await redisProvider.isAvailable();
      if (!available) {
        console.warn('Redis not available, falling back to local cache only');
        redisProvider = null;
      }
    }

    this.client = new CacheClient(
      this.config,
      localProvider,
      redisProvider,
      this.metrics
    );

    return this.client;
  }

  /**
   * Get statistics
   */
  getStats(): CacheStats {
    return this.metrics.getStats();
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Create a memoized function
   */
  memoize<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    options: {
      keyPrefix: string;
      ttl?: number;
      keyGenerator?: (...args: TArgs) => string;
    }
  ): (...args: TArgs) => Promise<TResult> {
    const { keyPrefix, ttl, keyGenerator } = options;

    return async (...args: TArgs): Promise<TResult> => {
      const client = await this.getClient();
      const key = keyGenerator
        ? `${keyPrefix}:${keyGenerator(...args)}`
        : `${keyPrefix}:${JSON.stringify(args)}`;

      const entry = await client.getOrSet(key, () => fn(...args), { ttl });
      return entry.value;
    };
  }
}

/**
 * Create a new cache manager
 */
export function createCacheManager(config?: Partial<CacheConfig>): CacheManager {
  return new CacheManager(config);
}

// Default singleton instance
let defaultManager: CacheManager | null = null;

/**
 * Get default cache manager
 */
export function getDefaultCacheManager(): CacheManager {
  if (!defaultManager) {
    defaultManager = createCacheManager();
  }
  return defaultManager;
}
