#!/usr/bin/env node
/**
 * CLI for Safety Harness
 *
 * Provides command-line interface for running safety tests.
 */

import { Command } from 'commander';
import { SafetyHarnessRunner, RunnerConfig } from './runner.js';
import { SafetyReporter } from './reporter.js';
import { MetricsCollector } from './metrics.js';
import { ReportFormat } from './types.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

const program = new Command();

program
  .name('safety-harness')
  .description('IntelGraph Safety Harness - Red Team Testing Framework')
  .version('1.0.0');

/**
 * Run test suite command
 */
program
  .command('run-suite')
  .description('Run safety test suite')
  .option('-t, --testpacks-dir <path>', 'Test packs directory', '../testpacks')
  .option('-e, --endpoint <url>', 'Target API endpoint', 'http://localhost:4000')
  .option('--environment <env>', 'Environment name', 'development')
  .option('--model-version <version>', 'Model version')
  .option('--build-version <version>', 'Build version')
  .option('-p, --parallel', 'Run tests in parallel', false)
  .option('-c, --concurrency <num>', 'Max concurrency', '5')
  .option('--timeout <ms>', 'Request timeout', '30000')
  .option('--api-key <key>', 'API key for authentication')
  .option('--packs <ids...>', 'Specific test pack IDs to run')
  .option('--previous-run <id>', 'Previous run ID for regression detection')
  .option('-o, --output <path>', 'Output file path', './safety-report.json')
  .option('-f, --format <format>', 'Report format (json|html|markdown|junit|csv)', 'json')
  .option('--no-console', 'Disable console summary')
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan('\n🛡️  IntelGraph Safety Harness\n'));

      const config: RunnerConfig = {
        testPacksDir: options.testpacksDir,
        targetEndpoint: options.endpoint,
        environment: options.environment,
        modelVersion: options.modelVersion,
        buildVersion: options.buildVersion,
        parallel: options.parallel,
        maxConcurrency: parseInt(options.concurrency),
        timeout: parseInt(options.timeout),
        apiKey: options.apiKey,
        previousRunId: options.previousRun,
      };

      console.log(chalk.gray('Configuration:'));
      console.log(chalk.gray(`  Endpoint:     ${config.targetEndpoint}`));
      console.log(chalk.gray(`  Environment:  ${config.environment}`));
      console.log(chalk.gray(`  Parallel:     ${config.parallel}`));
      console.log(chalk.gray(`  Concurrency:  ${config.maxConcurrency}\n`));

      // Initialize runner
      const runner = new SafetyHarnessRunner(config);

      // Load test packs
      console.log(chalk.yellow('📦 Loading test packs...'));
      await runner.loadTestPacks(options.packs);

      // Run tests
      console.log(chalk.yellow('🚀 Executing test suite...\n'));
      const testRun = await runner.runAll();

      // Generate report
      console.log(chalk.yellow('\n📄 Generating report...'));
      const reporter = new SafetyReporter(testRun);

      await reporter.generate({
        format: options.format as ReportFormat,
        outputPath: options.output,
        includeDetails: true,
        includeLogs: false,
        highlightFailures: true,
      });

      console.log(chalk.green(`✓ Report saved to: ${options.output}`));

      // Print console summary
      if (options.console !== false) {
        reporter.printConsoleSummary();
      }

      // Exit with appropriate code
      const exitCode = testRun.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    } catch (error: any) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

/**
 * Run differential testing command
 */
program
  .command('differential')
  .description('Run differential testing between two versions')
  .requiredOption('--baseline-endpoint <url>', 'Baseline API endpoint')
  .requiredOption('--baseline-version <version>', 'Baseline version')
  .requiredOption('--candidate-endpoint <url>', 'Candidate API endpoint')
  .requiredOption('--candidate-version <version>', 'Candidate version')
  .option('-t, --testpacks-dir <path>', 'Test packs directory', '../testpacks')
  .option('--packs <ids...>', 'Specific test pack IDs to run')
  .option('--max-new-failures <num>', 'Max allowed new failures', '0')
  .option('--max-regression-rate <rate>', 'Max allowed regression rate', '0.05')
  .option('-o, --output <path>', 'Output file path', './differential-report.json')
  .action(async (options) => {
    try {
      console.log(chalk.bold.cyan('\n🔬 Differential Safety Testing\n'));

      // Run baseline
      console.log(chalk.yellow('📊 Testing baseline...'));
      const baselineRunner = new SafetyHarnessRunner({
        testPacksDir: options.testpacksDir,
        targetEndpoint: options.baselineEndpoint,
        environment: 'baseline',
        modelVersion: options.baselineVersion,
        parallel: true,
        maxConcurrency: 5,
        timeout: 30000,
      });

      await baselineRunner.loadTestPacks(options.packs);
      const baselineRun = await baselineRunner.runAll();

      console.log(chalk.gray(`  Baseline: ${baselineRun.summary.passed}/${baselineRun.summary.total} passed\n`));

      // Run candidate
      console.log(chalk.yellow('🧪 Testing candidate...'));
      const candidateRunner = new SafetyHarnessRunner({
        testPacksDir: options.testpacksDir,
        targetEndpoint: options.candidateEndpoint,
        environment: 'candidate',
        modelVersion: options.candidateVersion,
        parallel: true,
        maxConcurrency: 5,
        timeout: 30000,
      });

      await candidateRunner.loadTestPacks(options.packs);
      const candidateRun = await candidateRunner.runAll();

      console.log(chalk.gray(`  Candidate: ${candidateRun.summary.passed}/${candidateRun.summary.total} passed\n`));

      // Compare results
      console.log(chalk.yellow('📈 Analyzing differences...'));
      const comparison = compareDifferential(baselineRun, candidateRun);

      // Determine verdict
      const maxNewFailures = parseInt(options.maxNewFailures);
      const maxRegressionRate = parseFloat(options.maxRegressionRate);

      let verdict: 'pass' | 'fail' | 'warning' = 'pass';
      let reason = 'No significant regressions detected';

      if (comparison.newFailures > maxNewFailures) {
        verdict = 'fail';
        reason = `Too many new failures: ${comparison.newFailures} > ${maxNewFailures}`;
      } else if (comparison.regressionRate > maxRegressionRate) {
        verdict = 'warning';
        reason = `Regression rate above threshold: ${(comparison.regressionRate * 100).toFixed(1)}% > ${(maxRegressionRate * 100).toFixed(1)}%`;
      }

      // Print results
      console.log(chalk.bold('\n📊 Differential Analysis:'));
      console.log(`  New Failures:    ${comparison.newFailures}`);
      console.log(`  New Passes:      ${comparison.newPasses}`);
      console.log(`  Regressions:     ${comparison.regressions}`);
      console.log(`  Improvements:    ${comparison.improvements}`);
      console.log(`  Unchanged:       ${comparison.unchanged}`);
      console.log(`  Regression Rate: ${(comparison.regressionRate * 100).toFixed(2)}%`);

      console.log(chalk.bold(`\n${verdict === 'pass' ? chalk.green('✓') : verdict === 'warning' ? chalk.yellow('⚠') : chalk.red('✗')} Verdict: ${verdict.toUpperCase()}`));
      console.log(`  ${reason}\n`);

      // Save report
      const report = {
        baseline: baselineRun,
        candidate: candidateRun,
        comparison,
        verdict,
        reason,
      };

      await writeFile(options.output, JSON.stringify(report, null, 2), 'utf-8');
      console.log(chalk.green(`✓ Report saved to: ${options.output}\n`));

      // Exit with appropriate code
      const exitCode = verdict === 'fail' ? 1 : 0;
      process.exit(exitCode);
    } catch (error: any) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Report generation command
 */
program
  .command('report')
  .description('Generate report from existing test run')
  .requiredOption('-i, --input <path>', 'Input test run JSON file')
  .option('-o, --output <path>', 'Output file path', './report.html')
  .option('-f, --format <format>', 'Report format (json|html|markdown|junit|csv)', 'html')
  .action(async (options) => {
    try {
      console.log(chalk.yellow('📄 Loading test run...'));
      const content = await readFile(options.input, 'utf-8');
      const testRun = JSON.parse(content);

      console.log(chalk.yellow('✏️  Generating report...'));
      const reporter = new SafetyReporter(testRun);

      await reporter.generate({
        format: options.format as ReportFormat,
        outputPath: options.output,
        includeDetails: true,
        includeLogs: false,
        highlightFailures: true,
      });

      console.log(chalk.green(`✓ Report saved to: ${options.output}\n`));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * List test packs command
 */
program
  .command('list')
  .description('List available test packs')
  .option('-t, --testpacks-dir <path>', 'Test packs directory', '../testpacks')
  .action(async (options) => {
    try {
      const runner = new SafetyHarnessRunner({
        testPacksDir: options.testpacksDir,
        targetEndpoint: 'http://localhost:4000',
        environment: 'development',
        parallel: false,
        maxConcurrency: 1,
        timeout: 30000,
      });

      await runner.loadTestPacks();

      console.log(chalk.bold('\n📦 Available Test Packs:\n'));
      // List would be implemented by exposing testPacks from runner
      console.log(chalk.gray('  (Implementation pending)\n'));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();

/**
 * Helper: Compare differential test runs
 */
function compareDifferential(baseline: any, candidate: any) {
  const baselineResults = new Map(baseline.results.map((r: any) => [r.scenarioId, r]));
  const candidateResults = new Map(candidate.results.map((r: any) => [r.scenarioId, r]));

  let newFailures = 0;
  let newPasses = 0;
  let regressions = 0;
  let improvements = 0;
  let unchanged = 0;

  for (const [scenarioId, candidateResult] of candidateResults) {
    const baselineResult = baselineResults.get(scenarioId);

    if (!baselineResult) {
      // New scenario
      if (!candidateResult.passed) newFailures++;
      continue;
    }

    if (baselineResult.passed && !candidateResult.passed) {
      regressions++;
      newFailures++;
    } else if (!baselineResult.passed && candidateResult.passed) {
      improvements++;
      newPasses++;
    } else {
      unchanged++;
    }
  }

  const total = candidateResults.size;
  const regressionRate = regressions / total;

  return {
    newFailures,
    newPasses,
    regressions,
    improvements,
    unchanged,
    regressionRate,
  };
}
