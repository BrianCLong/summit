import { performance } from 'node:perf_hooks';

import { observeCache } from './metrics.js';

export interface CacheClientLike {
  get(key: string): Promise<string | null> | string | null;
  setEx(key: string, ttlSeconds: number, value: string): Promise<unknown> | unknown;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class InMemoryCacheClient implements CacheClientLike {
  private readonly ttlMs: number;

  private readonly store: Map<string, CacheEntry> = new Map();

  constructor(ttlSeconds: number) {
    this.ttlMs = ttlSeconds * 1000;
  }

  async get(key: string): Promise<string | null> {
    const hit = this.store.get(key);
    if (!hit) {
      return null;
    }
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    const ttlMs = ttlSeconds > 0 ? ttlSeconds * 1000 : this.ttlMs;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export function instrumentCacheClient(
  cache: CacheClientLike,
  cacheName: string,
): CacheClientLike {
  return {
    async get(key: string): Promise<string | null> {
      const start = performance.now();
      try {
        const value = await cache.get(key);
        observeCache({
          cache: cacheName,
          operation: 'get',
          result: value ? 'hit' : 'miss',
          durationMs: performance.now() - start,
        });
        return value;
      } catch (error) {
        observeCache({
          cache: cacheName,
          operation: 'get',
          result: 'error',
          durationMs: performance.now() - start,
        });
        throw error;
      }
    },
    async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
      const start = performance.now();
      try {
        await cache.setEx(key, ttlSeconds, value);
        observeCache({
          cache: cacheName,
          operation: 'set',
          result: 'ok',
          durationMs: performance.now() - start,
        });
      } catch (error) {
        observeCache({
          cache: cacheName,
          operation: 'set',
          result: 'error',
          durationMs: performance.now() - start,
        });
        throw error;
      }
    },
  };
}

export function buildCacheClient(
  provided: CacheClientLike | undefined,
  cacheName: string,
  defaultTtlSeconds: number,
): CacheClientLike {
  const baseCache = provided ?? new InMemoryCacheClient(defaultTtlSeconds);
  return instrumentCacheClient(baseCache, cacheName);
}
