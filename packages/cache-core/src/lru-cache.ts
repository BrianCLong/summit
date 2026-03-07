import type { CacheEntry } from "./types.js";

/**
 * Simple LRU cache with byte-based eviction and TTL support.
 * Uses a Map for O(1) access while maintaining insertion order for LRU.
 */
export class LRUCache<V = unknown> {
  private readonly maxBytes: number;
  private readonly cache: Map<string, CacheEntry<V>>;
  private currentBytes: number;

  constructor(options: { maxBytes: number }) {
    this.maxBytes = options.maxBytes;
    this.cache = new Map();
    this.currentBytes = 0;
  }

  /**
   * Calculate the size of an entry in bytes
   */
  private calculateSize(key: string, value: V): number {
    const keyBytes = Buffer.byteLength(key, "utf8");
    const valueBytes = Buffer.byteLength(JSON.stringify(value), "utf8");
    // Add overhead for the entry metadata (approximately 100 bytes)
    return keyBytes + valueBytes + 100;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: V, options?: { ttlSeconds?: number; tags?: string[] }): void {
    const ttlSeconds = options?.ttlSeconds ?? Infinity;
    const size = this.calculateSize(key, value);

    // Don't cache if single entry exceeds max size
    if (size > this.maxBytes) {
      return;
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentBytes -= existing.size ?? 0;
      this.cache.delete(key);
    }

    // Evict until we have space
    while (this.currentBytes + size > this.maxBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }

    const entry: CacheEntry<V> = {
      value,
      expiresAt: ttlSeconds === Infinity ? Infinity : Date.now() + ttlSeconds * 1000,
      tags: options?.tags,
      size,
    };

    this.cache.set(key, entry);
    this.currentBytes += size;
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentBytes -= entry.size ?? 0;
      this.cache.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Delete entries matching a pattern (glob style with *)
   */
  deleteByPattern(pattern: string): number {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Delete entries with a specific tag
   */
  deleteByTag(tag: string): number {
    let deleted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.currentBytes = 0;
  }

  /**
   * Get the number of entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get the current bytes used
   */
  get bytes(): number {
    return this.currentBytes;
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all keys
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
}
