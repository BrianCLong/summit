import { EventEmitter } from 'events';
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'stream-metrics' });

/**
 * Real-time metrics calculator
 */
export class MetricsCalculator extends EventEmitter {
  private redis: Redis | null = null;
  private inMemoryMetrics: Map<string, MetricValue> = new Map();

  constructor(redisUrl?: string) {
    super();
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
  }

  /**
   * Increment counter
   */
  async increment(metric: string, value: number = 1, tags?: Record<string, string>): Promise<void> {
    const key = this.buildKey(metric, tags);

    if (this.redis) {
      await this.redis.incrby(key, value);
    } else {
      const current = this.inMemoryMetrics.get(key) || { value: 0, timestamp: Date.now() };
      this.inMemoryMetrics.set(key, { value: current.value + value, timestamp: Date.now() });
    }

    this.emit('metric', { metric, value, tags, type: 'counter' });
  }

  /**
   * Record gauge value
   */
  async gauge(metric: string, value: number, tags?: Record<string, string>): Promise<void> {
    const key = this.buildKey(metric, tags);

    if (this.redis) {
      await this.redis.set(key, value);
    } else {
      this.inMemoryMetrics.set(key, { value, timestamp: Date.now() });
    }

    this.emit('metric', { metric, value, tags, type: 'gauge' });
  }

  /**
   * Record histogram value
   */
  async histogram(metric: string, value: number, tags?: Record<string, string>): Promise<void> {
    const key = this.buildKey(`${metric}:histogram`, tags);

    if (this.redis) {
      await this.redis.zadd(key, Date.now(), value.toString());
      await this.redis.expire(key, 3600); // 1 hour TTL
    } else {
      // Store in memory (simplified)
      const current = this.inMemoryMetrics.get(key) || { value: [], timestamp: Date.now() };
      if (Array.isArray(current.value)) {
        current.value.push(value);
      }
      this.inMemoryMetrics.set(key, current);
    }

    this.emit('metric', { metric, value, tags, type: 'histogram' });
  }

  /**
   * Calculate percentile
   */
  async percentile(metric: string, p: number, tags?: Record<string, string>): Promise<number> {
    const key = this.buildKey(`${metric}:histogram`, tags);

    if (this.redis) {
      const values = await this.redis.zrange(key, 0, -1);
      if (values.length === 0) return 0;

      const sorted = values.map(Number).sort((a, b) => a - b);
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    } else {
      const current = this.inMemoryMetrics.get(key);
      if (!current || !Array.isArray(current.value)) return 0;

      const sorted = (current.value as number[]).sort((a, b) => a - b);
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    }
  }

  /**
   * Get metric value
   */
  async get(metric: string, tags?: Record<string, string>): Promise<number> {
    const key = this.buildKey(metric, tags);

    if (this.redis) {
      const value = await this.redis.get(key);
      return value ? parseFloat(value) : 0;
    } else {
      const current = this.inMemoryMetrics.get(key);
      return typeof current?.value === 'number' ? current.value : 0;
    }
  }

  /**
   * Build metric key with tags
   */
  private buildKey(metric: string, tags?: Record<string, string>): string {
    if (!tags) return metric;

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${metric}{${tagString}}`;
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

interface MetricValue {
  value: number | number[];
  timestamp: number;
}

/**
 * Moving average calculator
 */
export class MovingAverageCalculator {
  private windows: Map<string, number[]> = new Map();

  constructor(private windowSize: number) {}

  /**
   * Add value and get moving average
   */
  add(key: string, value: number): number {
    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }

    const window = this.windows.get(key)!;
    window.push(value);

    if (window.length > this.windowSize) {
      window.shift();
    }

    return window.reduce((a, b) => a + b, 0) / window.length;
  }

  /**
   * Get current moving average
   */
  get(key: string): number {
    const window = this.windows.get(key);
    if (!window || window.length === 0) return 0;

    return window.reduce((a, b) => a + b, 0) / window.length;
  }
}

/**
 * Top-K tracker
 */
export class TopKTracker<T> {
  private counts: Map<T, number> = new Map();

  /**
   * Add item
   */
  add(item: T): void {
    const count = this.counts.get(item) || 0;
    this.counts.set(item, count + 1);
  }

  /**
   * Get top K items
   */
  getTopK(k: number): Array<{ item: T; count: number }> {
    const sorted = Array.from(this.counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, k);

    return sorted.map(([item, count]) => ({ item, count }));
  }

  /**
   * Clear counts
   */
  clear(): void {
    this.counts.clear();
  }
}

/**
 * HyperLogLog for distinct count estimation
 */
export class HyperLogLog {
  private registers: Uint8Array;
  private m: number;
  private alpha: number;

  constructor(precision: number = 14) {
    this.m = 1 << precision;
    this.registers = new Uint8Array(this.m);

    // Alpha constant for bias correction
    this.alpha = precision <= 4 ? 0.673 :
                 precision === 5 ? 0.697 :
                 precision === 6 ? 0.709 :
                 0.7213 / (1 + 1.079 / this.m);
  }

  /**
   * Add value
   */
  add(value: string): void {
    const hash = this.hash(value);
    const j = hash & (this.m - 1);
    const w = hash >>> Math.log2(this.m);
    const leadingZeros = this.countLeadingZeros(w) + 1;

    if (leadingZeros > this.registers[j]) {
      this.registers[j] = leadingZeros;
    }
  }

  /**
   * Get cardinality estimate
   */
  count(): number {
    let sum = 0;
    let zeros = 0;

    for (let i = 0; i < this.m; i++) {
      sum += 1 / Math.pow(2, this.registers[i]);
      if (this.registers[i] === 0) zeros++;
    }

    const estimate = this.alpha * this.m * this.m / sum;

    // Small range correction
    if (estimate <= 2.5 * this.m && zeros > 0) {
      return this.m * Math.log(this.m / zeros);
    }

    // Large range correction
    if (estimate > (1 / 30) * Math.pow(2, 32)) {
      return -Math.pow(2, 32) * Math.log(1 - estimate / Math.pow(2, 32));
    }

    return estimate;
  }

  /**
   * Simple hash function
   */
  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash >>> 0; // Unsigned
  }

  /**
   * Count leading zeros
   */
  private countLeadingZeros(n: number): number {
    if (n === 0) return 32;
    let count = 0;
    for (let i = 31; i >= 0; i--) {
      if ((n & (1 << i)) === 0) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}
