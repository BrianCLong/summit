import { describe, it, expect } from 'vitest';
import { BenchmarkHarness } from '../harness.js';
import type { BenchmarkConfig } from '../types.js';

describe('BenchmarkHarness', () => {
  const defaultConfig: BenchmarkConfig = {
    name: 'test-benchmark',
    subsystem: 'api',
    language: 'typescript',
    workloadType: 'cpu',
    iterations: 100,
    warmupIterations: 10,
    timeout: 5000,
    tags: ['test'],
  };

  it('should run a simple benchmark', async () => {
    const harness = new BenchmarkHarness(defaultConfig);

    let counter = 0;
    harness.add('increment', () => {
      counter++;
    });

    const result = await harness.run();

    expect(result.config.name).toBe('test-benchmark');
    expect(result.stats.iterations).toBeGreaterThan(0);
    expect(result.stats.mean).toBeGreaterThan(0);
    expect(result.stats.opsPerSecond).toBeGreaterThan(0);
    expect(result.passed).toBe(true);
  });

  it('should calculate percentiles correctly', async () => {
    const harness = new BenchmarkHarness(defaultConfig);

    harness.add('variable-work', () => {
      // Simulate variable work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });

    const result = await harness.run();

    expect(result.stats.percentiles.p50).toBeGreaterThan(0);
    expect(result.stats.percentiles.p95).toBeGreaterThan(0);
    expect(result.stats.percentiles.p99).toBeGreaterThan(0);
    expect(result.stats.percentiles.p99).toBeGreaterThanOrEqual(result.stats.percentiles.p95);
    expect(result.stats.percentiles.p95).toBeGreaterThanOrEqual(result.stats.percentiles.p50);
  });

  it('should fail threshold check when exceeded', async () => {
    const harness = new BenchmarkHarness(defaultConfig, {
      maxMean: 1, // 1 nanosecond - impossible to achieve
    });

    harness.add('slow-op', () => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) {
        sum += i;
      }
      return sum;
    });

    const result = await harness.run();
    expect(result.passed).toBe(false);
  });

  it('should pass threshold check when within limits', async () => {
    const harness = new BenchmarkHarness(defaultConfig, {
      maxMean: 1_000_000_000, // 1 second
      minOpsPerSecond: 1,
    });

    harness.add('fast-op', () => {
      return 1 + 1;
    });

    const result = await harness.run();
    expect(result.passed).toBe(true);
  });

  it('should capture memory statistics', async () => {
    const harness = new BenchmarkHarness(defaultConfig);

    harness.add('memory-test', () => {
      const arr = new Array(100).fill(0);
      return arr.length;
    });

    const result = await harness.run();

    expect(result.memory.heapUsedBefore).toBeGreaterThan(0);
    expect(result.memory.heapUsedAfter).toBeGreaterThan(0);
  });

  describe('formatDuration', () => {
    it('should format nanoseconds', () => {
      expect(BenchmarkHarness.formatDuration(500)).toBe('500.00 ns');
    });

    it('should format microseconds', () => {
      expect(BenchmarkHarness.formatDuration(5000)).toBe('5.00 µs');
    });

    it('should format milliseconds', () => {
      expect(BenchmarkHarness.formatDuration(5_000_000)).toBe('5.00 ms');
    });

    it('should format seconds', () => {
      expect(BenchmarkHarness.formatDuration(5_000_000_000)).toBe('5.00 s');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(BenchmarkHarness.formatBytes(500)).toBe('500.00 B');
    });

    it('should format kilobytes', () => {
      expect(BenchmarkHarness.formatBytes(5000)).toBe('4.88 KB');
    });

    it('should format megabytes', () => {
      expect(BenchmarkHarness.formatBytes(5_000_000)).toBe('4.77 MB');
    });

    it('should format gigabytes', () => {
      expect(BenchmarkHarness.formatBytes(5_000_000_000)).toBe('4.66 GB');
    });
  });
});
