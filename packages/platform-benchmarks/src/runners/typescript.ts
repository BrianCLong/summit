import { BenchmarkSuite, createBenchmarkSuite } from '../suite.js';
import type { BenchmarkSuiteConfig, BenchmarkDefinition } from '../types.js';

/**
 * TypeScript benchmark runner
 *
 * Runs benchmarks directly in the Node.js process
 */
export class TypeScriptRunner {
  private suite: BenchmarkSuite;

  constructor(config: BenchmarkSuiteConfig) {
    this.suite = createBenchmarkSuite({
      ...config,
      name: config.name || 'TypeScript Benchmarks',
    });
  }

  /**
   * Add a benchmark
   */
  add(definition: BenchmarkDefinition): this {
    this.suite.add({
      ...definition,
      config: {
        ...definition.config,
        language: 'typescript',
      },
    });
    return this;
  }

  /**
   * Run all benchmarks
   */
  async run() {
    return this.suite.run();
  }

  /**
   * Get underlying suite
   */
  getSuite(): BenchmarkSuite {
    return this.suite;
  }
}
