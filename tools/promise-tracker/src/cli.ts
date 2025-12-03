#!/usr/bin/env tsx
/**
 * Promise Tracker CLI
 *
 * Main entry point for the promise tracking system.
 *
 * Commands:
 *   extract   - Scan codebase for promises/TODOs
 *   report    - Generate backlog health report
 *   sync      - Sync staging items to GitHub issues
 *   health    - Show backlog health metrics
 *   init      - Initialize promise tracker in a repo
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { extractPromises } from './extract.js';
import { generateReport } from './report.js';
import { generateHealthMetrics } from './health.js';
import { syncToGitHub } from './sync.js';
import { initializeTracker } from './init.js';

const program = new Command();

program
  .name('promise-tracker')
  .description('Track promises from docs to production')
  .version('1.0.0');

// =============================================================================
// Extract Command
// =============================================================================

program
  .command('extract')
  .description('Scan codebase for promises, TODOs, and commitments')
  .option('-o, --output <path>', 'Output file path', '.promise-tracker/staging.json')
  .option('--code-only', 'Only scan code files')
  .option('--docs-only', 'Only scan documentation')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('\n=== Promise Tracker: Extract ===\n'));

    try {
      const result = await extractPromises();

      console.log(chalk.green(`\nExtraction complete!`));
      console.log(`  Total items found: ${chalk.bold(result.staging.length)}`);
      console.log(`  Code TODOs: ${result.stats.todosFound}`);
      console.log(`  Doc commitments: ${result.stats.commitmentsFound}`);
      console.log(`  Checklist items: ${result.stats.checklistItemsFound}`);

      if (options.verbose) {
        console.log('\n' + chalk.gray('Sample items:'));
        result.staging.slice(0, 5).forEach((item, i) => {
          console.log(chalk.gray(`  ${i + 1}. [${item.component}] ${item.rough_title.slice(0, 60)}...`));
        });
      }

      console.log(chalk.gray(`\nOutput: ${options.output}`));
    } catch (error) {
      console.error(chalk.red('Extraction failed:'), error);
      process.exit(1);
    }
  });

// =============================================================================
// Report Command
// =============================================================================

program
  .command('report')
  .description('Generate backlog health report')
  .option('-f, --format <format>', 'Output format: json, markdown, table', 'table')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    console.log(chalk.blue('\n=== Promise Tracker: Report ===\n'));

    try {
      const report = await generateReport(options.format);
      console.log(report);

      if (options.output) {
        const { writeFileSync } = await import('fs');
        writeFileSync(options.output, report);
        console.log(chalk.gray(`\nReport written to: ${options.output}`));
      }
    } catch (error) {
      console.error(chalk.red('Report generation failed:'), error);
      process.exit(1);
    }
  });

// =============================================================================
// Health Command
// =============================================================================

program
  .command('health')
  .description('Show backlog health metrics')
  .option('--ci', 'CI mode - exit with error if health thresholds not met')
  .action(async (options) => {
    console.log(chalk.blue('\n=== Promise Tracker: Health ===\n'));

    try {
      const health = await generateHealthMetrics();

      // Display health dashboard
      console.log(chalk.bold('Backlog Health Dashboard\n'));
      console.log(`Total Items: ${chalk.bold(health.total_items)}`);
      console.log(`Doc-Only (not implemented): ${chalk.yellow(health.doc_only_count)}`);
      console.log(`Stale In-Progress (>14d): ${health.stale_in_progress > 0 ? chalk.red(health.stale_in_progress) : chalk.green(health.stale_in_progress)}`);
      console.log(`Missing Acceptance Criteria: ${health.missing_acceptance_criteria > 0 ? chalk.yellow(health.missing_acceptance_criteria) : chalk.green(health.missing_acceptance_criteria)}`);
      console.log(`Validation Rate: ${health.validated_rate >= 80 ? chalk.green(health.validated_rate + '%') : chalk.yellow(health.validated_rate + '%')}`);

      console.log(chalk.bold('\nBy Status:'));
      Object.entries(health.by_status).forEach(([status, count]) => {
        const color = status === 'validated' ? chalk.green : status === 'blocked' ? chalk.red : chalk.white;
        console.log(`  ${status}: ${color(count)}`);
      });

      console.log(chalk.bold('\nBy Component:'));
      Object.entries(health.by_component)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .forEach(([component, count]) => {
          console.log(`  ${component}: ${count}`);
        });

      // CI mode - check thresholds
      if (options.ci) {
        const issues: string[] = [];
        if (health.stale_in_progress > 5) {
          issues.push(`Too many stale in-progress items: ${health.stale_in_progress}`);
        }
        if (health.validated_rate < 50) {
          issues.push(`Validation rate too low: ${health.validated_rate}%`);
        }

        if (issues.length > 0) {
          console.log(chalk.red('\n=== Health Check Failed ==='));
          issues.forEach((issue) => console.log(chalk.red(`  - ${issue}`)));
          process.exit(1);
        }

        console.log(chalk.green('\n=== Health Check Passed ==='));
      }
    } catch (error) {
      console.error(chalk.red('Health check failed:'), error);
      process.exit(1);
    }
  });

// =============================================================================
// Sync Command
// =============================================================================

program
  .command('sync')
  .description('Sync staging items to GitHub issues')
  .option('--dry-run', 'Show what would be created without actually creating')
  .option('--limit <n>', 'Limit number of issues to create', '10')
  .option('--component <component>', 'Only sync items for specific component')
  .action(async (options) => {
    console.log(chalk.blue('\n=== Promise Tracker: Sync ===\n'));

    try {
      const result = await syncToGitHub({
        dryRun: options.dryRun,
        limit: parseInt(options.limit, 10),
        component: options.component,
      });

      if (options.dryRun) {
        console.log(chalk.yellow('DRY RUN - No issues created\n'));
      }

      console.log(`Issues ${options.dryRun ? 'would be ' : ''}created: ${result.created}`);
      console.log(`Issues ${options.dryRun ? 'would be ' : ''}updated: ${result.updated}`);
      console.log(`Skipped (already exists): ${result.skipped}`);

      if (result.errors.length > 0) {
        console.log(chalk.red('\nErrors:'));
        result.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
      }
    } catch (error) {
      console.error(chalk.red('Sync failed:'), error);
      process.exit(1);
    }
  });

// =============================================================================
// Init Command
// =============================================================================

program
  .command('init')
  .description('Initialize promise tracker in the repository')
  .action(async () => {
    console.log(chalk.blue('\n=== Promise Tracker: Initialize ===\n'));

    try {
      await initializeTracker();
      console.log(chalk.green('Promise tracker initialized successfully!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  1. Run `pnpm promise-tracker extract` to scan for promises'));
      console.log(chalk.gray('  2. Review .promise-tracker/staging.json'));
      console.log(chalk.gray('  3. Run `pnpm promise-tracker sync --dry-run` to preview GitHub sync'));
    } catch (error) {
      console.error(chalk.red('Initialization failed:'), error);
      process.exit(1);
    }
  });

// =============================================================================
// Parse and Run
// =============================================================================

program.parse();
