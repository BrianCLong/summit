/**
 * LRU Cache with TTL for performance optimization
 *
 * Provides efficient caching for consent lookups and model registrations.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(options: { maxSize?: number; defaultTtlMs?: number } = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTtlMs = options.defaultTtlMs ?? 300_000; // 5 minutes default
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  invalidatePattern(pattern: (key: K) => boolean): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

// Singleton caches for different data types
export const consentCache = new LRUCache<string, unknown>({
  maxSize: 10000,
  defaultTtlMs: 60_000, // 1 minute for consent (may change frequently)
});

export const modelCache = new LRUCache<string, unknown>({
  maxSize: 500,
  defaultTtlMs: 300_000, // 5 minutes for models (change less frequently)
});

export const decisionCache = new LRUCache<string, unknown>({
  maxSize: 5000,
  defaultTtlMs: 600_000, // 10 minutes for decisions (immutable once made)
});
