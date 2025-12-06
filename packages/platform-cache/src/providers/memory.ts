import { LRUCache } from 'lru-cache';
import type { CacheProvider } from '../types.js';

/**
 * Memory provider options
 */
export interface MemoryProviderOptions {
  /** Maximum number of items */
  maxSize?: number;
  /** Default TTL in milliseconds */
  ttl?: number;
}

/**
 * In-memory LRU cache provider
 */
export class MemoryProvider implements CacheProvider {
  readonly name = 'memory';
  private cache: LRUCache<string, string>;

  constructor(options: MemoryProviderOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize ?? 1000,
      ttl: options.ttl ?? 60000,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get(key);
    if (value === undefined) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl !== undefined) {
      this.cache.set(key, serialized, { ttl: ttl * 1000 });
    } else {
      this.cache.set(key, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    // Convert glob pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  async ttl(key: string): Promise<number> {
    const remaining = this.cache.getRemainingTTL(key);
    return remaining > 0 ? Math.floor(remaining / 1000) : -1;
  }

  async close(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }
}
