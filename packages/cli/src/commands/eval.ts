/**
 * Summit CLI Evaluation Commands
 *
 * Deep research evaluation harness.
 *
 * SOC 2 Controls: CC7.1 (System Operations)
 *
 * @module @summit/cli/commands/eval
 */

/* eslint-disable no-console */
import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  formatSummary,
  resolveThresholds,
  runDeepResearchEval,
  type EvaluationThresholds,
} from '@summit/deep-research-eval';

const deepResearch = new Command('deep-research')
  .description('Evaluate deep research reports against a task pack')
  .requiredOption('--taskpack <path>', 'Path to task pack JSON')
  .requiredOption('--reports <path>', 'Path to reports JSON')
  .requiredOption('--out <dir>', 'Output directory for evidence bundles')
  .requiredOption('--run-id <id>', 'Deterministic run identifier')
  .option('--dry-run', 'Use mocked retrieval for deterministic outputs', false)
  .option('--thresholds <json>', 'Override thresholds as JSON string')
  .option('--waiver <path>', 'Path to a waiver JSON file with expiry')
  .action(async (options) => {
    const thresholds: EvaluationThresholds | undefined = options.thresholds
      ? JSON.parse(options.thresholds)
      : undefined;

    const resolvedThresholds = resolveThresholds(thresholds);
    const summary = await runDeepResearchEval({
      taskPackPath: options.taskpack,
      reportsPath: options.reports,
      outDir: options.out,
      runId: options.runId,
      dryRun: options.dryRun,
      thresholds: resolvedThresholds,
      waiverPath: options.waiver,
    });

    const formatted = formatSummary(summary, resolvedThresholds);

    console.log(`\nDeep Research Eval (${summary.runId})`);
    console.log(`Status: ${formatted.status.toUpperCase()}`);
    console.log(formatted.message);

    const summaryPath = join(options.out, options.runId, 'summary.json');
    await mkdir(join(options.out, options.runId), { recursive: true });
    await writeFile(summaryPath, JSON.stringify({
      summary,
      thresholds: resolvedThresholds,
      status: formatted.status,
      message: formatted.message,
    }, null, 2));

    if (formatted.status === 'fail') {
      process.exitCode = 1;
    }
  });

export const evalCommands = {
  deepResearch,
};
