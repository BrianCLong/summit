import { Bench } from 'tinybench';
import { execSync } from 'node:child_process';
import * as os from 'node:os';
import type {
  BenchmarkConfig,
  BenchmarkResult,
  BenchmarkStats,
  MemoryStats,
  BenchmarkThreshold,
  BenchmarkFn,
} from './types.js';

/**
 * Get current git commit hash
 */
function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get platform information
 */
function getPlatformInfo() {
  return {
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
  };
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate standard deviation
 */
function stdDev(values: number[], mean: number): number {
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Benchmark harness for running and analyzing benchmarks
 */
export class BenchmarkHarness {
  private bench: Bench;
  private config: BenchmarkConfig;
  private threshold?: BenchmarkThreshold;

  constructor(config: BenchmarkConfig, threshold?: BenchmarkThreshold) {
    this.config = config;
    this.threshold = threshold;
    this.bench = new Bench({
      iterations: config.iterations,
      warmupIterations: config.warmupIterations,
      time: 0, // We control iterations, not time
    });
  }

  /**
   * Add a benchmark function to run
   */
  add(name: string, fn: BenchmarkFn): this {
    this.bench.add(name, fn);
    return this;
  }

  /**
   * Run all benchmarks and return results
   */
  async run(): Promise<BenchmarkResult> {
    // Capture memory before
    const memBefore = process.memoryUsage();

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    // Run benchmarks
    await this.bench.run();

    // Capture memory after
    const memAfter = process.memoryUsage();

    // Get results from first task (we only add one)
    const task = this.bench.tasks[0];
    if (!task || !task.result) {
      throw new Error('Benchmark did not produce results');
    }

    const result = task.result;
    const samples = result.samples;
    const sortedSamples = [...samples].sort((a, b) => a - b);

    // Calculate statistics
    const stats: BenchmarkStats = {
      iterations: samples.length,
      mean: result.mean,
      stdDev: stdDev(samples, result.mean),
      min: result.min,
      max: result.max,
      percentiles: {
        p50: percentile(sortedSamples, 50),
        p75: percentile(sortedSamples, 75),
        p90: percentile(sortedSamples, 90),
        p95: percentile(sortedSamples, 95),
        p99: percentile(sortedSamples, 99),
      },
      opsPerSecond: 1e9 / result.mean, // Convert from ns to ops/sec
      marginOfError: result.moe,
      rme: result.rme,
    };

    // Memory stats
    const memory: MemoryStats = {
      heapUsedBefore: memBefore.heapUsed,
      heapUsedAfter: memAfter.heapUsed,
      heapUsedPeak: Math.max(memBefore.heapUsed, memAfter.heapUsed),
      external: memAfter.external,
      arrayBuffers: memAfter.arrayBuffers,
    };

    // Check threshold
    const passed = this.checkThreshold(stats);

    return {
      config: this.config,
      stats,
      memory,
      timestamp: new Date().toISOString(),
      gitCommit: getGitCommit(),
      nodeVersion: process.version,
      platform: getPlatformInfo(),
      passed,
      threshold: this.threshold,
    };
  }

  /**
   * Check if results pass threshold
   */
  private checkThreshold(stats: BenchmarkStats): boolean {
    if (!this.threshold) return true;

    const { maxMean, maxP99, minOpsPerSecond, maxRsd } = this.threshold;

    if (maxMean !== undefined && stats.mean > maxMean) {
      return false;
    }

    if (maxP99 !== undefined && stats.percentiles.p99 > maxP99) {
      return false;
    }

    if (minOpsPerSecond !== undefined && stats.opsPerSecond < minOpsPerSecond) {
      return false;
    }

    if (maxRsd !== undefined && stats.rme > maxRsd) {
      return false;
    }

    return true;
  }

  /**
   * Format duration in human-readable form
   */
  static formatDuration(ns: number): string {
    if (ns < 1000) {
      return `${ns.toFixed(2)} ns`;
    } else if (ns < 1_000_000) {
      return `${(ns / 1000).toFixed(2)} µs`;
    } else if (ns < 1_000_000_000) {
      return `${(ns / 1_000_000).toFixed(2)} ms`;
    } else {
      return `${(ns / 1_000_000_000).toFixed(2)} s`;
    }
  }

  /**
   * Format bytes in human-readable form
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
