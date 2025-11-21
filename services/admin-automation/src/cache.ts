/**
 * In-memory LRU cache with TTL support for performance optimization.
 * Reduces database lookups for frequently accessed citizen profiles.
 */
export class ProfileCache<T> {
  private cache: Map<string, { value: T; expiresAt: number }> = new Map();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(options: { maxSize?: number; ttlSeconds?: number } = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttlMs = (options.ttlSeconds || 300) * 1000; // Default 5 minutes
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  /**
   * Get or compute value if not cached
   */
  async getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const value = await compute();
    this.set(key, value);
    return value;
  }
}

/**
 * Cache statistics for monitoring
 */
export class CacheStats {
  private hits = 0;
  private misses = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
