/**
 * Performance utilities for AI-Human Collaboration Service
 * Provides LRU caching and efficient indexing for high-throughput operations
 */

/**
 * LRU Cache implementation for frequently accessed recommendations/decisions
 */
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

/**
 * Secondary index for efficient lookups by non-primary keys
 */
export class SecondaryIndex<K, V> {
  private index: Map<K, Set<V>> = new Map();

  add(key: K, value: V): void {
    let values = this.index.get(key);
    if (!values) {
      values = new Set();
      this.index.set(key, values);
    }
    values.add(value);
  }

  get(key: K): V[] {
    const values = this.index.get(key);
    return values ? Array.from(values) : [];
  }

  remove(key: K, value: V): boolean {
    const values = this.index.get(key);
    if (values) {
      const deleted = values.delete(value);
      if (values.size === 0) {
        this.index.delete(key);
      }
      return deleted;
    }
    return false;
  }

  has(key: K): boolean {
    return this.index.has(key);
  }

  clear(): void {
    this.index.clear();
  }

  get size(): number {
    return this.index.size;
  }
}

/**
 * Time-based expiration tracker for recommendations
 */
export class ExpirationTracker<K> {
  private expirations: Map<K, number> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 60000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  set(key: K, expiresAt: Date | string): void {
    const timestamp = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
    this.expirations.set(key, timestamp);
  }

  isExpired(key: K): boolean {
    const expiresAt = this.expirations.get(key);
    if (expiresAt === undefined) return false;
    return Date.now() > expiresAt;
  }

  getExpired(): K[] {
    const now = Date.now();
    const expired: K[] = [];
    for (const [key, expiresAt] of this.expirations) {
      if (now > expiresAt) {
        expired.push(key);
      }
    }
    return expired;
  }

  remove(key: K): void {
    this.expirations.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.expirations) {
      if (now > expiresAt) {
        this.expirations.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.expirations.clear();
  }

  get size(): number {
    return this.expirations.size;
  }
}

/**
 * Batch processor for efficient bulk operations
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private readonly batchSize: number;
  private readonly processCallback: (items: T[]) => Promise<void>;
  private flushTimeout?: ReturnType<typeof setTimeout>;
  private readonly flushIntervalMs: number;

  constructor(
    processCallback: (items: T[]) => Promise<void>,
    batchSize = 100,
    flushIntervalMs = 5000
  ) {
    this.processCallback = processCallback;
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
  }

  async add(item: T): Promise<void> {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = undefined;
    }

    if (this.batch.length === 0) return;

    const items = this.batch;
    this.batch = [];

    await this.processCallback(items);
  }

  get pending(): number {
    return this.batch.length;
  }

  destroy(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = undefined;
    }
    this.batch = [];
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxTokens = 100, refillRate = 10) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  tryAcquire(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  async acquire(tokens = 1, timeoutMs = 5000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.tryAcquire(tokens)) {
        return true;
      }
      await this.sleep(100);
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Metrics collector for performance monitoring
 */
export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  histogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    // Keep last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    this.histograms.set(name, values);
  }

  timer<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      this.histogram(`${name}_duration_ms`, performance.now() - start);
    }
  }

  async timerAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.histogram(`${name}_duration_ms`, performance.now() - start);
    }
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  getGauge(name: string): number | undefined {
    return this.gauges.get(name);
  }

  getHistogramStats(name: string): { min: number; max: number; avg: number; p50: number; p95: number; p99: number } | undefined {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getAll(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, ReturnType<MetricsCollector['getHistogramStats']>>;
  } {
    const histogramStats: Record<string, ReturnType<MetricsCollector['getHistogramStats']>> = {};
    for (const name of this.histograms.keys()) {
      histogramStats[name] = this.getHistogramStats(name);
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramStats,
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}
