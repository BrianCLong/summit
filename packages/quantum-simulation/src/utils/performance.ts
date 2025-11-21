/**
 * Performance utilities for quantum simulation
 * Includes caching, batching, and optimization helpers
 */

/**
 * LRU Cache for simulation results
 */
export class SimulationCache<K, V> {
  private cache = new Map<string, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 100, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private getKey(key: K): string {
    return JSON.stringify(key);
  }

  get(key: K): V | undefined {
    const strKey = this.getKey(key);
    const entry = this.cache.get(strKey);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(strKey);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(strKey);
    this.cache.set(strKey, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    const strKey = this.getKey(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(strKey, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Batch processor for parallel quantum operations
 */
export class BatchProcessor<T, R> {
  private batchSize: number;
  private concurrency: number;

  constructor(batchSize = 10, concurrency = 4) {
    this.batchSize = batchSize;
    this.concurrency = concurrency;
  }

  async process(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    const batches: T[][] = [];

    // Split into batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += this.concurrency) {
      const batchPromises = batches
        .slice(i, i + this.concurrency)
        .map(batch => Promise.all(batch.map(processor)));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();

  record(name: string, durationMs: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(durationMs);
  }

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.record(name, performance.now() - start);
    }
  }

  getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getAllStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    for (const name of this.metrics.keys()) {
      const s = this.getStats(name);
      if (s) stats[name] = s;
    }
    return stats;
  }

  reset(): void {
    this.metrics.clear();
  }
}

/**
 * Memory-efficient statevector operations
 */
export class OptimizedStatevector {
  /**
   * Apply gate to statevector in-place to reduce allocations
   */
  static applyGateInPlace(
    statevector: Float64Array,
    gateMatrix: number[][],
    targetQubit: number,
    numQubits: number
  ): void {
    const size = 1 << numQubits;
    const step = 1 << targetQubit;

    for (let i = 0; i < size; i += step * 2) {
      for (let j = 0; j < step; j++) {
        const idx0 = (i + j) * 2;
        const idx1 = (i + j + step) * 2;

        const re0 = statevector[idx0];
        const im0 = statevector[idx0 + 1];
        const re1 = statevector[idx1];
        const im1 = statevector[idx1 + 1];

        // Apply 2x2 gate
        statevector[idx0] = gateMatrix[0][0] * re0 + gateMatrix[0][1] * re1;
        statevector[idx0 + 1] = gateMatrix[0][0] * im0 + gateMatrix[0][1] * im1;
        statevector[idx1] = gateMatrix[1][0] * re0 + gateMatrix[1][1] * re1;
        statevector[idx1 + 1] = gateMatrix[1][0] * im0 + gateMatrix[1][1] * im1;
      }
    }
  }
}
