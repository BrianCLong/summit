import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BenchmarkHarness } from '../harness.js';
import type {
  BenchmarkConfig,
  BenchmarkReporter,
  BenchmarkResult,
  BenchmarkSuiteConfig,
} from '../types.js';

/**
 * Markdown reporter for PR comments and documentation
 */
export class MarkdownReporter implements BenchmarkReporter {
  private outputPath?: string;
  private results: BenchmarkResult[] = [];
  private suiteConfig?: BenchmarkSuiteConfig;

  constructor(outputPath?: string) {
    this.outputPath = outputPath;
  }

  async onSuiteStart(suite: BenchmarkSuiteConfig): Promise<void> {
    this.suiteConfig = suite;
    this.results = [];
  }

  async onBenchmarkStart(_config: BenchmarkConfig): Promise<void> {
    // No-op
  }

  async onBenchmarkComplete(result: BenchmarkResult): Promise<void> {
    this.results.push(result);
  }

  async onSuiteComplete(results: BenchmarkResult[]): Promise<void> {
    const lines: string[] = [];

    // Header
    lines.push(`# Benchmark Results: ${this.suiteConfig?.name ?? 'Unknown'}`);
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Git Commit:** ${results[0]?.gitCommit ?? 'unknown'}`);
    lines.push(`**Platform:** ${results[0]?.platform.os ?? 'unknown'}`);
    lines.push('');

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total | ${results.length} |`);
    lines.push(`| Passed | ${passed} |`);
    lines.push(`| Failed | ${failed} |`);
    lines.push('');

    // Results table
    lines.push('## Results');
    lines.push('');
    lines.push('| Benchmark | Subsystem | Mean | p99 | Ops/sec | Status |');
    lines.push('|-----------|-----------|------|-----|---------|--------|');

    for (const result of results) {
      const status = result.passed ? '✅ Pass' : '❌ Fail';
      lines.push(
        `| ${result.config.name} | ${result.config.subsystem} | ` +
        `${BenchmarkHarness.formatDuration(result.stats.mean)} | ` +
        `${BenchmarkHarness.formatDuration(result.stats.percentiles.p99)} | ` +
        `${result.stats.opsPerSecond.toFixed(2)} | ${status} |`
      );
    }

    lines.push('');

    // Detailed results
    lines.push('## Detailed Results');
    lines.push('');

    for (const result of results) {
      lines.push(`### ${result.config.name}`);
      lines.push('');
      lines.push(`- **Subsystem:** ${result.config.subsystem}`);
      lines.push(`- **Workload Type:** ${result.config.workloadType}`);
      lines.push(`- **Iterations:** ${result.stats.iterations}`);
      lines.push('');
      lines.push('**Timing:**');
      lines.push(`- Mean: ${BenchmarkHarness.formatDuration(result.stats.mean)}`);
      lines.push(`- Min: ${BenchmarkHarness.formatDuration(result.stats.min)}`);
      lines.push(`- Max: ${BenchmarkHarness.formatDuration(result.stats.max)}`);
      lines.push(`- p50: ${BenchmarkHarness.formatDuration(result.stats.percentiles.p50)}`);
      lines.push(`- p95: ${BenchmarkHarness.formatDuration(result.stats.percentiles.p95)}`);
      lines.push(`- p99: ${BenchmarkHarness.formatDuration(result.stats.percentiles.p99)}`);
      lines.push('');
      lines.push('**Memory:**');
      lines.push(`- Heap Before: ${BenchmarkHarness.formatBytes(result.memory.heapUsedBefore)}`);
      lines.push(`- Heap After: ${BenchmarkHarness.formatBytes(result.memory.heapUsedAfter)}`);
      lines.push('');
    }

    const markdown = lines.join('\n');

    if (this.outputPath) {
      await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
      await fs.writeFile(this.outputPath, markdown, 'utf8');
    } else {
      console.log(markdown);
    }
  }

  async onError(error: Error, config?: BenchmarkConfig): Promise<void> {
    console.error(`Error in ${config?.name ?? 'unknown'}: ${error.message}`);
  }
}
