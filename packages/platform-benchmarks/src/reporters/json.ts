import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  BenchmarkConfig,
  BenchmarkReporter,
  BenchmarkResult,
  BenchmarkSuiteConfig,
} from '../types.js';

/**
 * JSON reporter for CI output
 */
export class JsonReporter implements BenchmarkReporter {
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
    const output = {
      suite: this.suiteConfig,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
      },
    };

    const json = JSON.stringify(output, null, 2);

    if (this.outputPath) {
      await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
      await fs.writeFile(this.outputPath, json, 'utf8');
    } else {
      console.log(json);
    }
  }

  async onError(error: Error, config?: BenchmarkConfig): Promise<void> {
    console.error(JSON.stringify({
      error: error.message,
      benchmark: config?.name,
    }));
  }
}
