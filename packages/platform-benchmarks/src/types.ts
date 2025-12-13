import { z } from 'zod';

/**
 * Benchmark configuration schema
 */
export const BenchmarkConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subsystem: z.enum(['api', 'graph', 'ml', 'worker', 'cache', 'db']),
  language: z.enum(['typescript', 'python', 'go']),
  workloadType: z.enum(['cpu', 'memory', 'io', 'network', 'mixed']),
  iterations: z.number().int().positive().default(1000),
  warmupIterations: z.number().int().nonnegative().default(100),
  timeout: z.number().positive().default(30000), // ms
  tags: z.array(z.string()).default([]),
});

export type BenchmarkConfig = z.infer<typeof BenchmarkConfigSchema>;

/**
 * Statistical results for a benchmark run
 */
export interface BenchmarkStats {
  /** Number of iterations completed */
  iterations: number;
  /** Mean execution time in nanoseconds */
  mean: number;
  /** Standard deviation in nanoseconds */
  stdDev: number;
  /** Minimum execution time in nanoseconds */
  min: number;
  /** Maximum execution time in nanoseconds */
  max: number;
  /** Percentile values in nanoseconds */
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** Operations per second */
  opsPerSecond: number;
  /** Margin of error (95% confidence) */
  marginOfError: number;
  /** Relative margin of error as percentage */
  rme: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Heap used before benchmark in bytes */
  heapUsedBefore: number;
  /** Heap used after benchmark in bytes */
  heapUsedAfter: number;
  /** Peak heap used during benchmark in bytes */
  heapUsedPeak: number;
  /** External memory in bytes */
  external: number;
  /** Array buffers in bytes */
  arrayBuffers: number;
}

/**
 * Complete benchmark result
 */
export interface BenchmarkResult {
  /** Benchmark configuration */
  config: BenchmarkConfig;
  /** Statistical results */
  stats: BenchmarkStats;
  /** Memory statistics */
  memory: MemoryStats;
  /** Timestamp of benchmark run */
  timestamp: string;
  /** Git commit hash */
  gitCommit: string;
  /** Node.js version */
  nodeVersion: string;
  /** Platform info */
  platform: {
    os: string;
    arch: string;
    cpus: number;
    totalMemory: number;
  };
  /** Whether the benchmark passed threshold */
  passed: boolean;
  /** Threshold that was checked */
  threshold?: BenchmarkThreshold;
  /** Error if benchmark failed */
  error?: string;
}

/**
 * Benchmark threshold for regression detection
 */
export interface BenchmarkThreshold {
  /** Maximum mean time in nanoseconds */
  maxMean?: number;
  /** Maximum p99 time in nanoseconds */
  maxP99?: number;
  /** Minimum operations per second */
  minOpsPerSecond?: number;
  /** Maximum relative standard deviation */
  maxRsd?: number;
  /** Maximum regression from baseline as percentage */
  maxRegression?: number;
}

/**
 * Baseline comparison result
 */
export interface BaselineComparison {
  /** Current benchmark result */
  current: BenchmarkResult;
  /** Baseline benchmark result */
  baseline: BenchmarkResult;
  /** Delta in mean time (positive = slower) */
  meanDelta: number;
  /** Delta as percentage */
  meanDeltaPercent: number;
  /** Delta in p99 time */
  p99Delta: number;
  /** Delta in ops/sec */
  opsPerSecondDelta: number;
  /** Whether this is a regression */
  isRegression: boolean;
  /** Regression severity if applicable */
  severity?: 'minor' | 'moderate' | 'severe';
}

/**
 * Benchmark suite configuration
 */
export interface BenchmarkSuiteConfig {
  /** Suite name */
  name: string;
  /** Suite description */
  description?: string;
  /** Default iterations for all benchmarks */
  defaultIterations?: number;
  /** Default warmup iterations */
  defaultWarmupIterations?: number;
  /** Baseline file path */
  baselinePath?: string;
  /** Output directory */
  outputDir?: string;
  /** Thresholds for regression detection */
  thresholds?: BenchmarkThreshold;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Benchmark function type
 */
export type BenchmarkFn = () => void | Promise<void>;

/**
 * Benchmark definition
 */
export interface BenchmarkDefinition {
  /** Benchmark name */
  name: string;
  /** Benchmark function */
  fn: BenchmarkFn;
  /** Setup function (runs once before all iterations) */
  setup?: () => void | Promise<void>;
  /** Teardown function (runs once after all iterations) */
  teardown?: () => void | Promise<void>;
  /** Per-iteration setup */
  beforeEach?: () => void | Promise<void>;
  /** Per-iteration teardown */
  afterEach?: () => void | Promise<void>;
  /** Benchmark-specific config overrides */
  config?: Partial<BenchmarkConfig>;
}

/**
 * Reporter interface for outputting results
 */
export interface BenchmarkReporter {
  /** Called when suite starts */
  onSuiteStart(suite: BenchmarkSuiteConfig): void | Promise<void>;
  /** Called when a benchmark starts */
  onBenchmarkStart(config: BenchmarkConfig): void | Promise<void>;
  /** Called when a benchmark completes */
  onBenchmarkComplete(result: BenchmarkResult): void | Promise<void>;
  /** Called when suite completes */
  onSuiteComplete(results: BenchmarkResult[]): void | Promise<void>;
  /** Called on error */
  onError(error: Error, config?: BenchmarkConfig): void | Promise<void>;
}

/**
 * CI output format
 */
export type OutputFormat = 'json' | 'markdown' | 'csv' | 'console';

/**
 * CLI options
 */
export interface CliOptions {
  /** Output format */
  format: OutputFormat;
  /** Output file path */
  output?: string;
  /** Baseline file for comparison */
  baseline?: string;
  /** Filter benchmarks by name pattern */
  filter?: string;
  /** Filter by tags */
  tags?: string[];
  /** CI mode (deterministic, no colors) */
  ci: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Fail on regression */
  failOnRegression: boolean;
  /** Regression threshold percentage */
  regressionThreshold: number;
}
