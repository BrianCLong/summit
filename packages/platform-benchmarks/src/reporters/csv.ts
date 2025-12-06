import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  BenchmarkConfig,
  BenchmarkReporter,
  BenchmarkResult,
  BenchmarkSuiteConfig,
} from '../types.js';

/**
 * CSV reporter for data analysis
 */
export class CsvReporter implements BenchmarkReporter {
  private outputPath?: string;
  private results: BenchmarkResult[] = [];

  constructor(outputPath?: string) {
    this.outputPath = outputPath;
  }

  async onSuiteStart(_suite: BenchmarkSuiteConfig): Promise<void> {
    this.results = [];
  }

  async onBenchmarkStart(_config: BenchmarkConfig): Promise<void> {
    // No-op
  }

  async onBenchmarkComplete(result: BenchmarkResult): Promise<void> {
    this.results.push(result);
  }

  async onSuiteComplete(results: BenchmarkResult[]): Promise<void> {
    const headers = [
      'name',
      'subsystem',
      'language',
      'workload_type',
      'iterations',
      'mean_ns',
      'stddev_ns',
      'min_ns',
      'max_ns',
      'p50_ns',
      'p75_ns',
      'p90_ns',
      'p95_ns',
      'p99_ns',
      'ops_per_second',
      'rme_percent',
      'passed',
      'git_commit',
      'timestamp',
    ];

    const rows = results.map((r) => [
      r.config.name,
      r.config.subsystem,
      r.config.language,
      r.config.workloadType,
      r.stats.iterations,
      r.stats.mean,
      r.stats.stdDev,
      r.stats.min,
      r.stats.max,
      r.stats.percentiles.p50,
      r.stats.percentiles.p75,
      r.stats.percentiles.p90,
      r.stats.percentiles.p95,
      r.stats.percentiles.p99,
      r.stats.opsPerSecond,
      r.stats.rme,
      r.passed,
      r.gitCommit,
      r.timestamp,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((v) => `"${v}"`).join(',')),
    ].join('\n');

    if (this.outputPath) {
      await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
      await fs.writeFile(this.outputPath, csv, 'utf8');
    } else {
      console.log(csv);
    }
  }

  async onError(error: Error, config?: BenchmarkConfig): Promise<void> {
    console.error(`Error in ${config?.name ?? 'unknown'}: ${error.message}`);
  }
}
