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

type RedisClient = Pick<
  Redis,
  | 'get'
  | 'setex'
  | 'del'
  | 'sadd'
  | 'smembers'
  | 'srem'
  | 'expire'
  | 'publish'
  | 'subscribe'
  | 'on'
  | 'duplicate'
>;

interface CacheEntry<V> {
  value: V;
  expiry: number;
  size: number;
  tags?: string[];
}

interface CachePayload<T> {
  value: T;
  tags?: string[];
  expiresAt: number;
}

interface CacheSetOptions {
  ttlSeconds?: number;
  tags?: string[];
}

interface MultiTierCacheOptions {
  namespace?: string;
  defaultTtlSeconds?: number;
  l1MaxBytes?: number;
  l1FallbackTtlSeconds?: number;
  cacheEnabled?: boolean;
  redisClient?: RedisClient;
  subscriberClient?: RedisClient;
}

type InvalidationMessage =
  | { type: 'key'; keys: string[] }
  | { type: 'tag'; tag: string; keys: string[] };

class SimpleLRUCache<K, V> {
  private maxSize: number;
  private currentSize: number;
  private cache: Map<K, CacheEntry<V>>;

  constructor(options: { maxSize: number }) {
    this.maxSize = options.maxSize;
    this.currentSize = 0;
    this.cache = new Map<K, CacheEntry<V>>();
  }

  private calculateSize(key: K, value: V): number {
    const keyString = String(key);
    const valueString = JSON.stringify(value);
    return (
      Buffer.byteLength(keyString, 'utf8') +
      Buffer.byteLength(valueString, 'utf8')
    );
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
    const size = this.calculateSize(key, value);

    if (size > this.maxSize) {
      logger.warn(
        { key, size, maxSize: this.maxSize },
        'Item is larger than the cache size and will not be stored.',
      );
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

function createRedisClient(): RedisClient | null {
  try {
    const client = new Redis({
      host: cfg.REDIS_HOST,
      port: cfg.REDIS_PORT,
      password: cfg.REDIS_PASSWORD,
    });

    client.on('connect', () =>
      logger.info('Redis client connected for multi-tier cache.'),
    );
    client.on('error', (err) =>
      logger.error({ err }, 'Redis cache client error.'),
    );

    return client;
  } catch (error) {
    logger.warn({ error }, 'Redis unavailable, using in-memory cache only.');
    return null;
  }
}

function buildPayload<T>(value: T, ttlSeconds: number, tags?: string[]): CachePayload<T> {
  return {
    value,
    tags,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

export class MultiTierCache {
  private readonly namespace: string;
  private readonly defaultTtlSeconds: number;
  private readonly l1FallbackTtlMs: number;
  private readonly cacheEnabled: boolean;
  private readonly l1Cache: SimpleLRUCache<string, CachePayload<any>>;
  private readonly redis: RedisClient | null;
  private readonly subscriber: RedisClient | null;
  private readonly inflight: Map<string, Promise<any>> = new Map();
  private readonly keyTags: Map<string, string[]> = new Map();
  private readonly tagIndex: Map<string, Set<string>> = new Map();

  constructor(options: MultiTierCacheOptions = {}) {
    this.namespace = options.namespace ?? 'cache';
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? cfg.CACHE_TTL_DEFAULT;
    this.l1FallbackTtlMs =
      (options.l1FallbackTtlSeconds ?? cfg.L1_CACHE_FALLBACK_TTL_SECONDS) * 1000;
    this.cacheEnabled = options.cacheEnabled ?? cfg.CACHE_ENABLED;
    this.l1Cache = new SimpleLRUCache<string, CachePayload<any>>({
      maxSize: options.l1MaxBytes ?? cfg.L1_CACHE_MAX_BYTES,
    });

    this.redis = options.redisClient ?? createRedisClient();
    this.subscriber =
      options.subscriberClient ?? this.redis?.duplicate?.() ?? null;

    this.setupPubSub();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.cacheEnabled) return null;

    const namespacedKey = this.namespaced(key);
    const l1Value = this.l1Cache.get(namespacedKey);

    if (l1Value) {
      metrics.cacheHits.inc({ level: 'l1' });
      return l1Value.value as T;
    }

    const payload = await this.readFromRedis<T>(namespacedKey);
    if (payload) {
      metrics.cacheHits.inc({ level: 'l3' });
      const remainingMs = payload.expiresAt - Date.now();
      const ttlMs = Math.min(remainingMs, this.l1FallbackTtlMs);
      this.l1Cache.set(namespacedKey, payload, { ttl: ttlMs });
      this.trackTags(namespacedKey, payload.tags);
      return payload.value as T;
    }

    metrics.cacheMisses.inc();
    return null;
  }

  async set<T>(
    key: string,
    value: T,
    ttlOrOptions?: number | CacheSetOptions,
    tags?: string[],
  ): Promise<void> {
    if (!this.cacheEnabled) return;

    const { ttlSeconds, tags: resolvedTags } = this.normalizeSetOptions(
      ttlOrOptions,
      tags,
    );
    const namespacedKey = this.namespaced(key);
    const payload = buildPayload(value, ttlSeconds, resolvedTags);

    this.l1Cache.set(namespacedKey, payload, { ttl: ttlSeconds * 1000 });
    this.trackTags(namespacedKey, resolvedTags);

    if (!this.redis) return;

    try {
      await this.redis.setex(namespacedKey, ttlSeconds, JSON.stringify(payload));
      await this.indexTags(namespacedKey, resolvedTags, ttlSeconds);
      await this.publishInvalidation({ type: 'key', keys: [namespacedKey] });
    } catch (error) {
      logger.error({ err: error, key: namespacedKey }, 'Failed to set key in cache');
    }
  }

  async wrap<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheSetOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const namespacedKey = this.namespaced(key);
    if (this.inflight.has(namespacedKey)) {
      return (await this.inflight.get(namespacedKey)) as T;
    }

    const inflightPromise = (async () => {
      const value = await factory();
      await this.set(key, value, options);
      return value;
    })();

    this.inflight.set(namespacedKey, inflightPromise);

    try {
      return await inflightPromise;
    } finally {
      this.inflight.delete(namespacedKey);
    }
  }

  async invalidate(key: string): Promise<void> {
    const namespacedKey = this.namespaced(key);
    const cachedTags = this.keyTags.get(namespacedKey);
    this.evictLocal(namespacedKey);

    if (!this.redis) return;

    try {
      const tags = (await this.readTags(namespacedKey)) ?? cachedTags;
      await this.redis.del(namespacedKey);
      await this.cleanupTagIndexes(namespacedKey, tags);
      await this.publishInvalidation({ type: 'key', keys: [namespacedKey] });
    } catch (error) {
      logger.error({ err: error, key: namespacedKey }, 'Failed to invalidate key in cache');
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = this.tagIndexKey(tag);
    const keys = await this.collectKeysForTag(tagKey);

    keys.forEach((k) => this.evictLocal(k));

    if (!this.redis) return;

    try {
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del(tagKey);
      await this.publishInvalidation({ type: 'tag', tag, keys });
    } catch (error) {
      logger.error({ err: error, tag }, 'Failed to invalidate tag cache');
    }
  }

  async shutdown(): Promise<void> {
    if (this.subscriber && 'quit' in this.subscriber) {
      // @ts-ignore - quit is available on ioredis but not in the narrowed type
      await (this.subscriber as any).quit();
    }
    if (this.redis && 'quit' in this.redis) {
      // @ts-ignore - quit is available on ioredis but not in the narrowed type
      await (this.redis as any).quit();
    }
  }

  private namespaced(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private tagIndexKey(tag: string): string {
    return `${this.namespace}:tag:${tag}`;
  }

  private normalizeSetOptions(
    ttlOrOptions?: number | CacheSetOptions,
    tags?: string[],
  ): { ttlSeconds: number; tags?: string[] } {
    if (typeof ttlOrOptions === 'number') {
      return {
        ttlSeconds: ttlOrOptions,
        tags,
      };
    }

    return {
      ttlSeconds: ttlOrOptions?.ttlSeconds ?? this.defaultTtlSeconds,
      tags: ttlOrOptions?.tags ?? tags,
    };
  }

  private trackTags(key: string, tags?: string[]): void {
    if (!tags || tags.length === 0) return;

    this.dropTagTracking(key);
    this.keyTags.set(key, tags);
    tags.forEach((tag) => {
      const entry = this.tagIndex.get(tag) ?? new Set<string>();
      entry.add(key);
      this.tagIndex.set(tag, entry);
    });
  }

  private evictLocal(key: string): void {
    this.l1Cache.delete(key);
    this.dropTagTracking(key);
  }

  private dropTagTracking(key: string): void {
    const tags = this.keyTags.get(key);
    if (tags) {
      tags.forEach((tag) => {
        const entry = this.tagIndex.get(tag);
        if (!entry) return;
        entry.delete(key);
        if (entry.size === 0) {
          this.tagIndex.delete(tag);
        }
      });
    }
    this.keyTags.delete(key);
  }

  private async readFromRedis<T>(key: string): Promise<CachePayload<T> | null> {
    if (!this.redis) return null;

    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;

      const payload = JSON.parse(raw) as CachePayload<T>;
      if (payload.expiresAt <= Date.now()) {
        await this.redis.del(key);
        return null;
      }

      this.trackTags(key, payload.tags);
      return payload;
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to read from cache');
      return null;
    }
  }

  private async readTags(key: string): Promise<string[] | undefined> {
    if (!this.redis) return this.keyTags.get(key);

    try {
      const raw = await this.redis.get(key);
      if (!raw) return this.keyTags.get(key);
      const payload = JSON.parse(raw) as CachePayload<unknown>;
      return payload.tags;
    } catch (error) {
      logger.warn({ err: error, key }, 'Unable to read tags for key');
      return this.keyTags.get(key);
    }
  }

  private async indexTags(
    key: string,
    tags: string[] | undefined,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.redis || !tags || tags.length === 0) return;

    await Promise.all(
      tags.map(async (tag) => {
        const tagKey = this.tagIndexKey(tag);
        await this.redis.sadd(tagKey, key);
        await this.redis.expire(tagKey, ttlSeconds);
      }),
    );
  }

  private async cleanupTagIndexes(
    key: string,
    tags: string[] | undefined,
  ): Promise<void> {
    if (!this.redis || !tags || tags.length === 0) return;

    await Promise.all(
      tags.map(async (tag) => {
        const tagKey = this.tagIndexKey(tag);
        await this.redis.srem(tagKey, key);
        const remaining = await this.redis.smembers(tagKey);
        if (remaining.length === 0) {
          await this.redis.del(tagKey);
        }
      }),
    );
  }

  private async collectKeysForTag(tagKey: string): Promise<string[]> {
    if (!this.redis) {
      const tag = tagKey.split(':').at(-1);
      if (!tag) return [];
      return Array.from(this.tagIndex.get(tag) ?? []);
    }

    try {
      const members = await this.redis.smembers(tagKey);
      return members.filter(Boolean);
    } catch (error) {
      logger.warn({ err: error, tagKey }, 'Failed to read tag index');
      return [];
    }
  }

  private async publishInvalidation(message: InvalidationMessage): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.publish(INVALIDATION_CHANNEL, JSON.stringify(message));
    } catch (error) {
      logger.warn({ err: error, message }, 'Failed to publish invalidation');
    }
  }

  private setupPubSub(): void {
    if (!this.subscriber) return;

    this.subscriber.on('message', (channel, message) => {
      if (channel !== INVALIDATION_CHANNEL) return;

      try {
        const payload = JSON.parse(message) as InvalidationMessage;
        if (payload.type === 'key') {
          payload.keys.forEach((key) => this.evictLocal(key));
        } else if (payload.type === 'tag') {
          payload.keys.forEach((key) => this.evictLocal(key));
        }
      } catch (error) {
        logger.warn({ err: error, message }, 'Failed to process invalidation');
      }
    });

    this.subscriber.subscribe(INVALIDATION_CHANNEL).catch((error) =>
      logger.warn({ err: error }, 'Failed to subscribe to invalidation channel'),
    );
  }
}
