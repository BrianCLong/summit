#!/usr/bin/env node
/**
 * CLI for running benchmarks
 */
import { program } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createBenchmarkSuite } from './suite.js';
import { ConsoleReporter } from './reporters/console.js';
import { JsonReporter } from './reporters/json.js';
import { MarkdownReporter } from './reporters/markdown.js';
import { CsvReporter } from './reporters/csv.js';
import { BaselineComparator } from './comparators/baseline.js';
import type { CliOptions, OutputFormat } from './types.js';

program
  .name('benchmark')
  .description('Summit Platform Benchmark CLI')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format (json|markdown|csv|console)', 'console')
  .option('-o, --output <path>', 'Output file path')
  .option('-b, --baseline <path>', 'Baseline file for comparison')
  .option('--filter <pattern>', 'Filter benchmarks by name pattern')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--ci', 'CI mode (deterministic, no colors)', false)
  .option('-v, --verbose', 'Verbose output', false)
  .option('--fail-on-regression', 'Exit with error on regression', false)
  .option('--regression-threshold <percent>', 'Regression threshold percentage', '10')
  .parse(process.argv);

const options = program.opts() as CliOptions;

async function main() {
  // Load benchmark definitions from benchmarks directory
  const benchmarksDir = path.join(process.cwd(), 'benchmarks');

  try {
    await fs.access(benchmarksDir);
  } catch {
    console.error('No benchmarks directory found. Create a "benchmarks" directory with benchmark files.');
    process.exit(1);
  }

  const files = await fs.readdir(benchmarksDir);
  const benchmarkFiles = files.filter(f => f.endsWith('.bench.ts') || f.endsWith('.bench.js'));

  if (benchmarkFiles.length === 0) {
    console.error('No benchmark files found (*.bench.ts or *.bench.js)');
    process.exit(1);
  }

  // Create suite
  const suite = createBenchmarkSuite({
    name: 'Summit Platform Benchmarks',
    description: 'Cross-subsystem performance benchmarks',
    defaultIterations: 1000,
    defaultWarmupIterations: 100,
  });

  // Clear default reporter and add configured ones
  suite.clearReporters();

  switch (options.format) {
    case 'json':
      suite.addReporter(new JsonReporter(options.output));
      break;
    case 'markdown':
      suite.addReporter(new MarkdownReporter(options.output));
      break;
    case 'csv':
      suite.addReporter(new CsvReporter(options.output));
      break;
    case 'console':
    default:
      suite.addReporter(new ConsoleReporter({ verbose: options.verbose, ci: options.ci }));
      break;
  }

  // Load and register benchmarks
  for (const file of benchmarkFiles) {
    const filePath = path.join(benchmarksDir, file);
    const module = await import(filePath);

    if (typeof module.default === 'function') {
      // Export is a function that registers benchmarks
      await module.default(suite);
    } else if (Array.isArray(module.benchmarks)) {
      // Export is an array of benchmark definitions
      for (const def of module.benchmarks) {
        // Filter by name if specified
        if (options.filter && !def.name.includes(options.filter)) {
          continue;
        }
        // Filter by tags if specified
        if (options.tags) {
          const filterTags = options.tags.split(',');
          const defTags = def.config?.tags || [];
          if (!filterTags.some(t => defTags.includes(t))) {
            continue;
          }
        }
        suite.add(def);
      }
    }
  }

  // Run benchmarks
  const results = await suite.run();

  // Compare with baseline if provided
  if (options.baseline) {
    const comparator = new BaselineComparator(parseFloat(options.regressionThreshold));
    await comparator.loadBaseline(options.baseline);
    const regressions = comparator.getRegressions(results);

    if (regressions.length > 0) {
      console.log('\n## Regressions Detected\n');
      for (const regression of regressions) {
        console.log(comparator.formatComparison(regression));
        console.log('');
      }

      if (options.failOnRegression) {
        process.exit(1);
      }
    }
  }

  // Exit with error if any benchmark failed
  if (!suite.allPassed()) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
