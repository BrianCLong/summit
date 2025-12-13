import chalk from 'chalk';
import Table from 'cli-table3';
import { BenchmarkHarness } from '../harness.js';
import type {
  BenchmarkConfig,
  BenchmarkReporter,
  BenchmarkResult,
  BenchmarkSuiteConfig,
} from '../types.js';

/**
 * Console reporter for benchmark results
 */
export class ConsoleReporter implements BenchmarkReporter {
  private verbose: boolean;
  private ci: boolean;

  constructor(options?: { verbose?: boolean; ci?: boolean }) {
    this.verbose = options?.verbose ?? false;
    this.ci = options?.ci ?? false;
  }

  async onSuiteStart(suite: BenchmarkSuiteConfig): Promise<void> {
    const title = this.ci ? suite.name : chalk.bold.blue(suite.name);
    console.log(`\n${title}`);
    if (suite.description) {
      console.log(this.ci ? suite.description : chalk.gray(suite.description));
    }
    console.log('');
  }

  async onBenchmarkStart(config: BenchmarkConfig): Promise<void> {
    if (this.verbose) {
      const name = this.ci ? config.name : chalk.cyan(config.name);
      console.log(`  Running: ${name}...`);
    }
  }

  async onBenchmarkComplete(result: BenchmarkResult): Promise<void> {
    const { config, stats, passed } = result;
    const status = passed
      ? this.ci ? '✓' : chalk.green('✓')
      : this.ci ? '✗' : chalk.red('✗');
    const name = this.ci ? config.name : chalk.white(config.name);
    const mean = BenchmarkHarness.formatDuration(stats.mean);
    const ops = stats.opsPerSecond.toFixed(2);

    console.log(`  ${status} ${name}: ${mean}/op (${ops} ops/sec)`);

    if (this.verbose) {
      console.log(`    p50: ${BenchmarkHarness.formatDuration(stats.percentiles.p50)}`);
      console.log(`    p95: ${BenchmarkHarness.formatDuration(stats.percentiles.p95)}`);
      console.log(`    p99: ${BenchmarkHarness.formatDuration(stats.percentiles.p99)}`);
      console.log(`    rme: ±${stats.rme.toFixed(2)}%`);
    }
  }

  async onSuiteComplete(results: BenchmarkResult[]): Promise<void> {
    console.log('');

    // Summary table
    const table = new Table({
      head: this.ci
        ? ['Benchmark', 'Mean', 'p99', 'Ops/sec', 'RME', 'Status']
        : [
            chalk.white('Benchmark'),
            chalk.white('Mean'),
            chalk.white('p99'),
            chalk.white('Ops/sec'),
            chalk.white('RME'),
            chalk.white('Status'),
          ],
      style: {
        head: [],
        border: [],
      },
    });

    for (const result of results) {
      const status = result.passed
        ? this.ci ? 'PASS' : chalk.green('PASS')
        : this.ci ? 'FAIL' : chalk.red('FAIL');

      table.push([
        result.config.name,
        BenchmarkHarness.formatDuration(result.stats.mean),
        BenchmarkHarness.formatDuration(result.stats.percentiles.p99),
        result.stats.opsPerSecond.toFixed(2),
        `±${result.stats.rme.toFixed(2)}%`,
        status,
      ]);
    }

    console.log(table.toString());

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const summary = this.ci
      ? `\n${passed} passed, ${failed} failed`
      : `\n${chalk.green(passed + ' passed')}, ${chalk.red(failed + ' failed')}`;

    console.log(summary);
  }

  async onError(error: Error, config?: BenchmarkConfig): Promise<void> {
    const prefix = config ? `[${config.name}] ` : '';
    const message = this.ci
      ? `  ✗ ${prefix}Error: ${error.message}`
      : chalk.red(`  ✗ ${prefix}Error: ${error.message}`);
    console.error(message);
  }
}
