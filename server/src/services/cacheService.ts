import { getRedisClient } from '../config/database.js';
import { cfg } from '../config.js';
import {
  recHit,
  recMiss,
  recSet,
  cacheLocalSize,
} from '../metrics/cacheMetrics.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private namespace = 'cache';
  private defaultTtl = cfg?.CACHE_TTL_DEFAULT ?? 300;
  private enabled = cfg?.CACHE_ENABLED ?? true;

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp >= entry.ttl * 1000;
  }

  private redis() {
    return this.enabled ? getRedisClient() : null;
  }

  private isCacheEntry<T>(val: any): val is CacheEntry<T> {
    return (
      val &&
      typeof val === 'object' &&
      'data' in val &&
      'timestamp' in val &&
      'ttl' in val
    );
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    const entry = this.memoryCache.get(key);
    if (entry && !this.isExpired(entry)) {
      recHit('memory', 'get');
      return entry.data as T;
    }
    if (entry) {
      this.memoryCache.delete(key);
    }

    const redis = this.redis();
    if (!redis) {
      recMiss('memory', 'get');
      return null;
    }

    try {
      const raw = await redis.get(this.getKey(key));
      if (!raw) {
        recMiss('redis', 'get');
        return null;
      }

      const parsed = JSON.parse(raw);
      const data = this.isCacheEntry<T>(parsed) ? parsed.data : (parsed as T);

      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: this.defaultTtl,
      });
      this.updateGauge();
      recHit('redis', 'get');
      return data as T;
    } catch {
      recMiss('redis', 'get');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.enabled) return;

    const effectiveTtl = ttl ?? this.defaultTtl;
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: effectiveTtl,
    });
    this.updateGauge();
    recSet('memory', 'set');

    const redis = this.redis();
    if (!redis) return;

    try {
      await redis.setex(this.getKey(key), effectiveTtl, JSON.stringify(value));
      recSet('redis', 'set');
    } catch {
      // Redis write failures should not break the request path
    }
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    this.updateGauge();
    const redis = this.redis();
    if (!redis) return;

    try {
      await redis.del(this.getKey(key));
    } catch {
      // Non-fatal
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await factory();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.memoryCache.values()) {
      if (this.isExpired(entry)) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.memoryCache.size,
      validEntries,
      expiredEntries,
      cacheType: 'memory+redis',
    };
  }

  cleanup(): void {
    let cleaned = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    this.updateGauge();
  }

  private updateGauge() {
    cacheLocalSize.labels(this.namespace).set(this.memoryCache.size);
  }
}

export const cacheService = new CacheService();

setInterval(() => cacheService.cleanup(), 5 * 60 * 1000);
