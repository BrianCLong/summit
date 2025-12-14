import crypto from 'crypto';
import type { Redis } from 'ioredis';
import { recEviction, recHit, recMiss, recSet, setHitRatio } from '../metrics/cacheMetrics.js';
import { logger } from '../utils/logger.js';

type CacheTier = 'ram' | 'flash';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
};

export interface QueryResultPayload {
  rows: unknown[];
  warnings: string[];
  executionTimeMs: number;
}

export interface QueryResultCacheConfig {
  ttlSeconds?: number;
  streamingTtlSeconds?: number;
  maxEntries?: number;
  partialLimit?: number;
}

interface CacheFetchResult extends QueryResultPayload {
  tier: CacheTier;
}

const DEFAULT_CONFIG: Required<QueryResultCacheConfig> = {
  ttlSeconds: 600,
  streamingTtlSeconds: 30,
  maxEntries: 500,
  partialLimit: 25,
};

/**
 * Multi-tier cache for Cypher/SQL query signatures.
 * - L1 RAM cache with LFU eviction
 * - L2 Redis (flash) cache for read-through/write-through
 * - Short-lived streaming cache for partial results to support progressive rendering
 */
export class QueryResultCache {
  private readonly l1: Map<string, CacheEntry<QueryResultPayload>> = new Map();
  private readonly streamingCache: Map<string, CacheEntry<unknown[]>> = new Map();
  private readonly config: Required<QueryResultCacheConfig>;
  private readonly redis: Redis | null;
  private readonly prefix = 'ig:query-cache:';
  private readonly streamingPrefix = 'ig:query-stream:';
  private hits = 0;
  private misses = 0;

  constructor(redis: Redis | null, config: QueryResultCacheConfig = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  buildSignature(
    language: string,
    query: string,
    parameters: Record<string, unknown> = {},
  ): string {
    const normalisedParams = this.normaliseParams(parameters);
    const paramHash = crypto.createHash('sha256').update(normalisedParams).digest('hex');
    const queryHash = crypto.createHash('sha256').update(query.trim()).digest('hex');
    return `${language}:${queryHash}:${paramHash}`;
  }

  getPartialLimit(): number {
    return this.config.partialLimit;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  async getResult(
    signature: string,
    tenantId?: string,
  ): Promise<CacheFetchResult | undefined> {
    const now = Date.now();
    const l1Entry = this.l1.get(signature);

    if (l1Entry && l1Entry.expiresAt > now) {
      l1Entry.accessCount++;
      l1Entry.lastAccessedAt = now;
      this.hits++;
      recHit('query-signature', 'result', tenantId);
      setHitRatio('query-signature', 'result', this.hits, this.misses);
      return { ...l1Entry.value, tier: 'ram' };
    }

    if (l1Entry) {
      this.l1.delete(signature);
    }

    if (!this.redis) {
      this.misses++;
      recMiss('query-signature', 'result', tenantId);
      setHitRatio('query-signature', 'result', this.hits, this.misses);
      return undefined;
    }

    const redisValue = await this.redis.get(this.prefix + signature);
    if (!redisValue) {
      this.misses++;
      recMiss('query-signature', 'result', tenantId);
      setHitRatio('query-signature', 'result', this.hits, this.misses);
      return undefined;
    }

    try {
      const parsed = JSON.parse(redisValue) as QueryResultPayload;
      this.setL1(signature, parsed, this.config.ttlSeconds);
      this.hits++;
      recHit('query-signature', 'result', tenantId);
      setHitRatio('query-signature', 'result', this.hits, this.misses);
      return { ...parsed, tier: 'flash' };
    } catch (error) {
      logger.warn({ error }, 'Failed to parse flash cache entry, treating as miss');
      this.misses++;
      recMiss('query-signature', 'result', tenantId);
      setHitRatio('query-signature', 'result', this.hits, this.misses);
      return undefined;
    }
  }

  async setResult(
    signature: string,
    value: QueryResultPayload,
    tenantId?: string,
  ): Promise<void> {
    this.setL1(signature, value, this.config.ttlSeconds);
    recSet('query-signature', 'result', tenantId);

    if (!this.redis) return;

    try {
      await this.redis.setex(
        this.prefix + signature,
        this.config.ttlSeconds,
        JSON.stringify(value),
      );
      recSet('query-signature', 'result-flash', tenantId);
    } catch (error) {
      logger.warn({ error }, 'Unable to write query cache entry to flash tier');
    }
  }

  async setStreamingPartial(
    signature: string,
    rows: unknown[],
    tenantId?: string,
  ): Promise<void> {
    const trimmed = rows.slice(0, this.config.partialLimit);
    this.setStreamingL1(signature, trimmed, this.config.streamingTtlSeconds);
    recSet('query-signature', 'streaming', tenantId);

    if (!this.redis) return;

    try {
      await this.redis.setex(
        this.streamingPrefix + signature,
        this.config.streamingTtlSeconds,
        JSON.stringify(trimmed),
      );
      recSet('query-signature', 'streaming-flash', tenantId);
    } catch (error) {
      logger.warn({ error }, 'Unable to write streaming cache entry to flash tier');
    }
  }

  async getStreamingPartial(
    signature: string,
    tenantId?: string,
  ): Promise<{ rows: unknown[]; tier: CacheTier } | undefined> {
    const now = Date.now();
    const l1Entry = this.streamingCache.get(signature);
    if (l1Entry && l1Entry.expiresAt > now) {
      l1Entry.accessCount++;
      l1Entry.lastAccessedAt = now;
      this.hits++;
      recHit('query-signature', 'streaming', tenantId);
      setHitRatio('query-signature', 'streaming', this.hits, this.misses);
      return { rows: l1Entry.value, tier: 'ram' };
    }

    if (l1Entry) {
      this.streamingCache.delete(signature);
    }

    if (!this.redis) {
      this.misses++;
      recMiss('query-signature', 'streaming', tenantId);
      setHitRatio('query-signature', 'streaming', this.hits, this.misses);
      return undefined;
    }

    const redisValue = await this.redis.get(this.streamingPrefix + signature);
    if (!redisValue) {
      this.misses++;
      recMiss('query-signature', 'streaming', tenantId);
      setHitRatio('query-signature', 'streaming', this.hits, this.misses);
      return undefined;
    }

    try {
      const parsed = JSON.parse(redisValue) as unknown[];
      this.setStreamingL1(signature, parsed, this.config.streamingTtlSeconds);
      this.hits++;
      recHit('query-signature', 'streaming', tenantId);
      setHitRatio('query-signature', 'streaming', this.hits, this.misses);
      return { rows: parsed, tier: 'flash' };
    } catch (error) {
      logger.warn({ error }, 'Failed to parse streaming cache entry, treating as miss');
      this.misses++;
      recMiss('query-signature', 'streaming', tenantId);
      setHitRatio('query-signature', 'streaming', this.hits, this.misses);
      return undefined;
    }
  }

  private setL1(
    signature: string,
    value: QueryResultPayload,
    ttlSeconds: number,
  ): void {
    this.ensureL1Capacity(this.l1);
    this.l1.set(signature, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      accessCount: 1,
      lastAccessedAt: Date.now(),
    });
  }

  private setStreamingL1(
    signature: string,
    value: unknown[],
    ttlSeconds: number,
  ): void {
    this.ensureL1Capacity(this.streamingCache);
    this.streamingCache.set(signature, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      accessCount: 1,
      lastAccessedAt: Date.now(),
    });
  }

  private ensureL1Capacity<T>(map: Map<string, CacheEntry<T>>): void {
    if (map.size < this.config.maxEntries) return;

    let candidate: { key: string; entry: CacheEntry<T> } | null = null;
    for (const [key, entry] of map.entries()) {
      if (
        !candidate ||
        entry.accessCount < candidate.entry.accessCount ||
        (entry.accessCount === candidate.entry.accessCount &&
          entry.lastAccessedAt < candidate.entry.lastAccessedAt)
      ) {
        candidate = { key, entry };
      }
    }

    if (candidate) {
      map.delete(candidate.key);
      recEviction('query-signature', 'lfu');
    }
  }

  private normaliseParams(params: Record<string, unknown>): string {
    const sortedEntries = Object.entries(params).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const normalised: Record<string, unknown> = {};
    for (const [key, value] of sortedEntries) {
      normalised[key] = value;
    }
    return JSON.stringify(normalised);
  }
}
