// NOTE: The 'lru-cache' package could not be installed due to a pre-existing
// dependency conflict in the monorepo (related to @react-native-firebase/app).
// A simplified, self-contained LRU cache with TTL is implemented here as a workaround
// to avoid getting blocked by the environment issue.

import Redis from 'ioredis';
import pino from 'pino';
import { cfg } from '../../config.js';
import { metrics } from '../../observability/metrics.js';

const logger = pino();
const INVALIDATION_CHANNEL = 'cache:invalidation';

interface CacheEntry<V> {
  value: V;
  expiry: number;
  size: number;
}

class SimpleLRUCache<K, V> {
  private maxSize: number;
  private currentSize: number;
  private cache: Map<K, CacheEntry<V>>;

  constructor(options: { maxSize: number }) {
    this.maxSize = options.maxSize;
    this.currentSize = 0;
    this.cache = new Map<K, CacheEntry<V>>();
  }

  private _calculateSize(key: K, value: V): number {
    const keyString = String(key);
    const valueString = JSON.stringify(value);
    return Buffer.byteLength(keyString, 'utf8') + Buffer.byteLength(valueString, 'utf8');
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      return undefined;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  delete(key: K): void {
      const entry = this.cache.get(key);
      if (entry) {
          this.currentSize -= entry.size;
          this.cache.delete(key);
      }
  }

  set(key: K, value: V, options?: { ttl: number }): void {
    const ttl = options?.ttl ?? Infinity;
    const size = this._calculateSize(key, value);

    if (size > this.maxSize) {
      logger.warn({ key, size, maxSize: this.maxSize }, 'Item is larger than the cache size and will not be stored.');
      return;
    }

    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
      this.cache.delete(key);
    }

    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      const oldestEntry = this.cache.get(oldestKey)!;
      this.currentSize -= oldestEntry.size;
      this.cache.delete(oldestKey);
    }

    const expiry = ttl === Infinity ? Infinity : Date.now() + ttl;
    this.cache.set(key, { value, expiry, size });
    this.currentSize += size;
  }
}

const l1Cache = new SimpleLRUCache<string, any>({
  maxSize: cfg.L1_CACHE_MAX_BYTES,
});

const redisClient = new Redis({
  host: cfg.REDIS_HOST,
  port: cfg.REDIS_PORT,
  password: cfg.REDIS_PASSWORD,
});

const subscriber = redisClient.duplicate();

subscriber.on('message', (channel, message) => {
    if (channel === INVALIDATION_CHANNEL) {
        l1Cache.delete(message);
    }
});

subscriber.subscribe(INVALIDATION_CHANNEL);


redisClient.on('connect', () =>
  logger.info('Redis client connected for L3 cache.'),
);
redisClient.on('error', (err) =>
  logger.error({ err }, 'Redis L3 cache client error.'),
);

export class MultiTierCache {
  async get(key: string): Promise<any | null> {
    try {
      const l1Value = l1Cache.get(key);
      if (l1Value) {
        metrics.cacheHits.inc({ level: 'l1' });
        return l1Value;
      }

      const [l3Value, ttl] = await redisClient.multi().get(key).ttl(key).exec();

      if (l3Value) {
        metrics.cacheHits.inc({ level: 'l3' });
        const parsedValue = JSON.parse(l3Value as string);
        const l1Ttl = ttl > 0 ? (ttl as number) * 1000 : cfg.L1_CACHE_FALLBACK_TTL_SECONDS * 1000;
        l1Cache.set(key, parsedValue, { ttl: l1Ttl });
        return parsedValue;
      }

      metrics.cacheMisses.inc();
      return null;
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to get key from cache');
      return null;
    }
  }

  async set(key: string, value: any, ttlInSeconds: number): Promise<void> {
    try {
      const ttlInMs = ttlInSeconds * 1000;
      l1Cache.set(key, value, { ttl: ttlInMs });
      await redisClient.setex(key, ttlInSeconds, JSON.stringify(value));
      redisClient.publish(INVALIDATION_CHANNEL, key);
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to set key in cache');
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
        l1Cache.delete(key);
        await redisClient.del(key);
        redisClient.publish(INVALIDATION_CHANNEL, key);
    } catch (error) {
        logger.error({ err: error, key}, 'Failed to invalidate key in cache');
    }
  }
}
