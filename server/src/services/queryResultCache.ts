import crypto from 'crypto';
import type { Redis } from 'ioredis';
import {
  cacheLatencySeconds,
  cacheLocalSize,
  recEviction,
  recHit,
  recMiss,
  recSet,
  setHitRatio,
} from '../metrics/cacheMetrics.js';
import { logger } from '../utils/logger.js';

type CacheTier = 'ram' | 'flash';
type CacheOperation = 'result' | 'streaming';

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
  streamingMaxEntries?: number;
  partialLimit?: number;
  namespace?: string;
  enabled?: boolean;
}

interface CacheFetchResult extends QueryResultPayload {
  tier: CacheTier;
}

const DEFAULT_CONFIG: Required<QueryResultCacheConfig> = {
  ttlSeconds: 600,
  streamingTtlSeconds: 30,
  maxEntries: 500,
  streamingMaxEntries: 250,
  partialLimit: 25,
  namespace: 'ig',
  enabled: true,
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
  private readonly prefix: string;
  private readonly streamingPrefix: string;
  private readonly stats: Record<CacheOperation, { hits: number; misses: number }> = {
    result: { hits: 0, misses: 0 },
    streaming: { hits: 0, misses: 0 },
  };

  constructor(redis: Redis | null, config: QueryResultCacheConfig = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
    const safeNamespace = this.normaliseNamespace(this.config.namespace);
    this.prefix = `${safeNamespace}:query-cache:`;
    this.streamingPrefix = `${safeNamespace}:query-stream:`;
  }

  /**
   * Build a stable cache signature using a tenant-scoped namespace to prevent cross-tenant leakage.
   * Redis key format:
   *   `<namespace>:query-cache:<tenant>:<language>:<queryHash>:<paramHash>`
   */
  buildSignature(
    language: string,
    query: string,
    parameters: Record<string, unknown> = {},
    tenantId?: string,
  ): string {
    const tenantSegment = this.normaliseTenant(tenantId);
    if (!tenantSegment) {
      throw new Error('QueryResultCache requires a tenantId to build cache signatures');
    }
    const normalisedParams = this.normaliseParams(parameters);
    const paramHash = crypto.createHash('sha256').update(normalisedParams).digest('hex');
    const queryHash = crypto.createHash('sha256').update(query.trim()).digest('hex');
    return `${tenantSegment}:${language}:${queryHash}:${paramHash}`;
  }

  getPartialLimit(): number {
    return this.config.partialLimit;
  }

  getHitRate(operation: CacheOperation = 'result'): number {
    const { hits, misses } = this.stats[operation];
    const total = hits + misses;
    return total === 0 ? 0 : hits / total;
  }

  getStats() {
    return {
      result: { ...this.stats.result, hitRate: this.getHitRate('result') },
      streaming: { ...this.stats.streaming, hitRate: this.getHitRate('streaming') },
      l1Entries: this.l1.size,
      streamingEntries: this.streamingCache.size,
    };
  }

  async getResult(
    signature: string,
    tenantId?: string,
  ): Promise<CacheFetchResult | undefined> {
    if (!this.config.enabled) {
      return undefined;
    }
    const now = Date.now();
    const started = now;
    const l1Entry = this.l1.get(signature);

    if (l1Entry && l1Entry.expiresAt > now) {
      l1Entry.accessCount++;
      l1Entry.lastAccessedAt = now;
      this.recordHit('result', tenantId);
      this.recordLatency('result', 'hit', tenantId, started);
      return { ...l1Entry.value, tier: 'ram' };
    }

    if (l1Entry) {
      this.l1.delete(signature);
      cacheLocalSize.labels('query-signature:result').set(this.l1.size);
    }

    if (!this.redis) {
      this.recordMiss('result', tenantId);
      this.recordLatency('result', 'miss', tenantId, started);
      return undefined;
    }

    const redisValue = await this.redis.get(this.prefix + signature);
    if (!redisValue) {
      this.recordMiss('result', tenantId);
      this.recordLatency('result', 'miss', tenantId, started);
      return undefined;
    }

    try {
      const parsed = JSON.parse(redisValue) as QueryResultPayload;
      this.setL1(signature, parsed, this.config.ttlSeconds);
      this.recordHit('result', tenantId);
      this.recordLatency('result', 'hit', tenantId, started);
      return { ...parsed, tier: 'flash' };
    } catch (error: any) {
      logger.warn({ error }, 'Failed to parse flash cache entry, treating as miss');
      this.recordMiss('result', tenantId);
      this.recordLatency('result', 'miss', tenantId, started);
      return undefined;
    }
  }

  async setResult(
    signature: string,
    value: QueryResultPayload,
    tenantId?: string,
  ): Promise<void> {
    if (!this.config.enabled) return;
    this.setL1(signature, value, this.config.ttlSeconds);
    cacheLocalSize.labels('query-signature:result').set(this.l1.size);
    recSet('query-signature', 'result', tenantId);

    if (!this.redis) return;

    try {
      await this.redis.setex(
        this.prefix + signature,
        this.config.ttlSeconds,
        JSON.stringify(value),
      );
      recSet('query-signature', 'result-flash', tenantId);
    } catch (error: any) {
      logger.warn({ error }, 'Unable to write query cache entry to flash tier');
    }
  }

  async setStreamingPartial(
    signature: string,
    rows: unknown[],
    tenantId?: string,
  ): Promise<void> {
    if (!this.config.enabled) return;
    const trimmed = rows.slice(0, this.config.partialLimit);
    this.setStreamingL1(signature, trimmed, this.config.streamingTtlSeconds);
    cacheLocalSize.labels('query-signature:streaming').set(this.streamingCache.size);
    recSet('query-signature', 'streaming', tenantId);

    if (!this.redis) return;

    try {
      await this.redis.setex(
        this.streamingPrefix + signature,
        this.config.streamingTtlSeconds,
        JSON.stringify(trimmed),
      );
      recSet('query-signature', 'streaming-flash', tenantId);
    } catch (error: any) {
      logger.warn({ error }, 'Unable to write streaming cache entry to flash tier');
    }
  }

  async getStreamingPartial(
    signature: string,
    tenantId?: string,
  ): Promise<{ rows: unknown[]; tier: CacheTier } | undefined> {
    if (!this.config.enabled) {
      return undefined;
    }
    const now = Date.now();
    const started = now;
    const l1Entry = this.streamingCache.get(signature);
    if (l1Entry && l1Entry.expiresAt > now) {
      l1Entry.accessCount++;
      l1Entry.lastAccessedAt = now;
      this.recordHit('streaming', tenantId);
      this.recordLatency('streaming', 'hit', tenantId, started);
      return { rows: l1Entry.value, tier: 'ram' };
    }

    if (l1Entry) {
      this.streamingCache.delete(signature);
      cacheLocalSize.labels('query-signature:streaming').set(this.streamingCache.size);
    }

    if (!this.redis) {
      this.recordMiss('streaming', tenantId);
      this.recordLatency('streaming', 'miss', tenantId, started);
      return undefined;
    }

    const redisValue = await this.redis.get(this.streamingPrefix + signature);
    if (!redisValue) {
      this.recordMiss('streaming', tenantId);
      this.recordLatency('streaming', 'miss', tenantId, started);
      return undefined;
    }

    try {
      const parsed = JSON.parse(redisValue) as unknown[];
      this.setStreamingL1(signature, parsed, this.config.streamingTtlSeconds);
      this.recordHit('streaming', tenantId);
      this.recordLatency('streaming', 'hit', tenantId, started);
      return { rows: parsed, tier: 'flash' };
    } catch (error: any) {
      logger.warn({ error }, 'Failed to parse streaming cache entry, treating as miss');
      this.recordMiss('streaming', tenantId);
      this.recordLatency('streaming', 'miss', tenantId, started);
      return undefined;
    }
  }

  async readThrough(
    signature: string,
    tenantId: string | undefined,
    loader: () => Promise<QueryResultPayload>,
    options: { primeStreaming?: boolean } = {},
  ): Promise<{ payload: QueryResultPayload; fromCache: boolean; tier?: CacheTier }> {
    if (!this.config.enabled) {
      const payload = await loader();
      return { payload, fromCache: false };
    }
    const cached = await this.getResult(signature, tenantId);
    if (cached) {
      return { payload: cached, fromCache: true, tier: cached.tier };
    }

    const payload = await loader();
    await this.setResult(signature, payload, tenantId);

    if (options.primeStreaming !== false) {
      await this.setStreamingPartial(signature, payload.rows, tenantId);
    }

    return { payload, fromCache: false };
  }

  private setL1(
    signature: string,
    value: QueryResultPayload,
    ttlSeconds: number,
  ): void {
    this.ensureL1Capacity(this.l1, 'result');
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
    this.ensureL1Capacity(this.streamingCache, 'streaming');
    this.streamingCache.set(signature, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      accessCount: 1,
      lastAccessedAt: Date.now(),
    });
  }

  private ensureL1Capacity<T>(
    map: Map<string, CacheEntry<T>>,
    operation: CacheOperation,
  ): void {
    const maxEntries =
      operation === 'streaming' ? this.config.streamingMaxEntries : this.config.maxEntries;
    if (map.size < maxEntries) return;

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
      recEviction('query-signature', `lfu-${operation}`);
      cacheLocalSize.labels(`query-signature:${operation}`).set(map.size);
    }
  }

  private normaliseParams(params: Record<string, unknown>): string {
    const stabilise = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(stabilise);
      }

      if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b),
        );
        return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
          acc[key] = stabilise(val);
          return acc;
        }, {});
      }

      return value;
    };

    return JSON.stringify(stabilise(params));
  }

  private normaliseNamespace(namespace: string): string {
    return namespace.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'ig';
  }

  private normaliseTenant(tenantId?: string): string {
    if (!tenantId) return '';
    return tenantId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  }

  private recordHit(operation: CacheOperation, tenantId?: string) {
    this.stats[operation].hits++;
    recHit('query-signature', operation, tenantId);
    setHitRatio(
      'query-signature',
      operation,
      this.stats[operation].hits,
      this.stats[operation].misses,
    );
  }

  private recordMiss(operation: CacheOperation, tenantId?: string) {
    this.stats[operation].misses++;
    recMiss('query-signature', operation, tenantId);
    setHitRatio(
      'query-signature',
      operation,
      this.stats[operation].hits,
      this.stats[operation].misses,
    );
  }

  private recordLatency(
    operation: CacheOperation,
    result: 'hit' | 'miss',
    tenantId: string | undefined,
    startedAt: number,
  ) {
    const durationSeconds = (Date.now() - startedAt) / 1000;
    cacheLatencySeconds.labels(operation, result, tenantId ?? 'unknown').observe(durationSeconds);
  }
}
