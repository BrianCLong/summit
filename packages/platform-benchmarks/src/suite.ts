import {
  BenchmarkHarness,
} from './harness.js';
import type {
  BenchmarkConfig,
  BenchmarkSuiteConfig,
  BenchmarkDefinition,
  BenchmarkResult,
  BenchmarkReporter,
  BenchmarkConfigSchema,
} from './types.js';
import { ConsoleReporter } from './reporters/console.js';

/**
 * Benchmark suite for organizing and running multiple benchmarks
 */
export class BenchmarkSuite {
  private config: BenchmarkSuiteConfig;
  private benchmarks: BenchmarkDefinition[] = [];
  private reporters: BenchmarkReporter[] = [];
  private results: BenchmarkResult[] = [];

  constructor(config: BenchmarkSuiteConfig) {
    this.config = config;
    // Default console reporter
    this.reporters.push(new ConsoleReporter());
  }

  /**
   * Add a benchmark to the suite
   */
  add(definition: BenchmarkDefinition): this {
    this.benchmarks.push(definition);
    return this;
  }

  /**
   * Add a reporter
   */
  addReporter(reporter: BenchmarkReporter): this {
    this.reporters.push(reporter);
    return this;
  }

  /**
   * Clear default reporters
   */
  clearReporters(): this {
    this.reporters = [];
    return this;
  }

  /**
   * Run all benchmarks in the suite
   */
  async run(): Promise<BenchmarkResult[]> {
    this.results = [];

    // Notify suite start
    for (const reporter of this.reporters) {
      await reporter.onSuiteStart(this.config);
    }

    for (const benchmark of this.benchmarks) {
      const config: BenchmarkConfig = {
        name: benchmark.name,
        subsystem: benchmark.config?.subsystem ?? 'api',
        language: benchmark.config?.language ?? 'typescript',
        workloadType: benchmark.config?.workloadType ?? 'cpu',
        iterations: benchmark.config?.iterations ?? this.config.defaultIterations ?? 1000,
        warmupIterations: benchmark.config?.warmupIterations ?? this.config.defaultWarmupIterations ?? 100,
        timeout: benchmark.config?.timeout ?? 30000,
        tags: benchmark.config?.tags ?? this.config.tags ?? [],
        description: benchmark.config?.description,
      };

      // Notify benchmark start
      for (const reporter of this.reporters) {
        await reporter.onBenchmarkStart(config);
      }

      try {
        // Run setup
        if (benchmark.setup) {
          await benchmark.setup();
        }

        // Create harness and run
        const harness = new BenchmarkHarness(config, this.config.thresholds);

        // Wrap function with before/after each if provided
        const wrappedFn = async () => {
          if (benchmark.beforeEach) {
            await benchmark.beforeEach();
          }
          await benchmark.fn();
          if (benchmark.afterEach) {
            await benchmark.afterEach();
          }
        };

        harness.add(benchmark.name, wrappedFn);
        const result = await harness.run();

        // Run teardown
        if (benchmark.teardown) {
          await benchmark.teardown();
        }

        this.results.push(result);

        // Notify benchmark complete
        for (const reporter of this.reporters) {
          await reporter.onBenchmarkComplete(result);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Notify error
        for (const reporter of this.reporters) {
          await reporter.onError(err, config);
        }

        // Add failed result
        this.results.push({
          config,
          stats: {
            iterations: 0,
            mean: 0,
            stdDev: 0,
            min: 0,
            max: 0,
            percentiles: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
            opsPerSecond: 0,
            marginOfError: 0,
            rme: 0,
          },
          memory: {
            heapUsedBefore: 0,
            heapUsedAfter: 0,
            heapUsedPeak: 0,
            external: 0,
            arrayBuffers: 0,
          },
          timestamp: new Date().toISOString(),
          gitCommit: 'unknown',
          nodeVersion: process.version,
          platform: {
            os: 'unknown',
            arch: 'unknown',
            cpus: 0,
            totalMemory: 0,
          },
          passed: false,
          error: err.message,
        });
      }
    }

    // Notify suite complete
    for (const reporter of this.reporters) {
      await reporter.onSuiteComplete(this.results);
    }

    return this.results;
  }

  /**
   * Get results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Check if all benchmarks passed
   */
  allPassed(): boolean {
    return this.results.every((r) => r.passed);
  }
}

/**
 * Create a new benchmark suite
 */
export function createBenchmarkSuite(config: BenchmarkSuiteConfig): BenchmarkSuite {
  return new BenchmarkSuite(config);
}
