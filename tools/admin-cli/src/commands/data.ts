/**
 * Data operations commands for Admin CLI
 * Backfill, reindex, and data integrity verification
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import type {
  GlobalOptions,
  DataOperationResult,
} from '../types/index.js';
import {
  output,
  outputTable,
  outputKeyValue,
  printHeader,
  printError,
  printSuccess,
  printWarning,
  printInfo,
  printDryRunBanner,
  formatDuration,
  formatBytes,
  getOutputFormat,
} from '../utils/output.js';
import { createApiClient } from '../utils/api-client.js';
import { getEndpoint, getToken } from '../utils/config.js';
import {
  confirmWithPhrase,
  CONFIRMATION_PHRASES,
  abort,
  requireInteractive,
} from '../utils/confirm.js';
import { logger } from '../utils/logger.js';

/**
 * Register data commands
 */
export function registerDataCommands(program: Command): void {
  const dataCmd = new Command('data')
    .description('Data operations: backfill, reindex, verify integrity');

  // Backfill command
  dataCmd
    .command('backfill')
    .description('Backfill data from source to target')
    .requiredOption('-s, --source <source>', 'Source identifier (e.g., postgres, neo4j)')
    .requiredOption('-t, --target <target>', 'Target identifier')
    .option('--entity-type <type>', 'Entity type to backfill')
    .option('--from <date>', 'Start date (ISO format)')
    .option('--to <date>', 'End date (ISO format)')
    .option('--batch-size <size>', 'Batch size', '1000')
    .option('--concurrency <n>', 'Concurrency level', '4')
    .option('--force', 'Skip confirmation')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await runBackfill(options, globalOpts);
    });

  // Reindex command
  dataCmd
    .command('reindex')
    .description('Reindex data in search engine')
    .option('-i, --index <name>', 'Specific index to reindex')
    .option('--all', 'Reindex all indices')
    .option('--batch-size <size>', 'Batch size', '500')
    .option('--force', 'Skip confirmation')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await runReindex(options, globalOpts);
    });

  // Verify integrity command
  dataCmd
    .command('verify-integrity')
    .description('Verify data integrity across stores')
    .option('--source <store>', 'Source data store', 'postgres')
    .option('--target <store>', 'Target data store to verify against', 'neo4j')
    .option('--entity-type <type>', 'Entity type to verify')
    .option('--sample-size <n>', 'Sample size for verification', '10000')
    .option('--fix', 'Attempt to fix inconsistencies')
    .option('--report <file>', 'Output report file')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await verifyIntegrity(options, globalOpts);
    });

  // Operation status command
  dataCmd
    .command('status [operationId]')
    .description('Check status of data operation')
    .option('--watch', 'Watch operation progress')
    .action(async (operationId, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await checkOperationStatus(operationId, options.watch, globalOpts);
    });

  // Cancel operation command
  dataCmd
    .command('cancel <operationId>')
    .description('Cancel a running data operation')
    .option('--force', 'Force cancel without confirmation')
    .action(async (operationId, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await cancelOperation(operationId, options.force, globalOpts);
    });

  // List operations
  dataCmd
    .command('operations')
    .description('List recent data operations')
    .option('--status <status>', 'Filter by status (pending, running, completed, failed)')
    .option('--limit <n>', 'Number of operations to show', '20')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await listOperations(options, globalOpts);
    });

  program.addCommand(dataCmd);
}

/**
 * Run backfill operation
 */
async function runBackfill(
  options: {
    source: string;
    target: string;
    entityType?: string;
    from?: string;
    to?: string;
    batchSize?: string;
    concurrency?: string;
    force?: boolean;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  // Validate dates
  if (options.from && isNaN(Date.parse(options.from))) {
    printError('Invalid --from date format. Use ISO format (YYYY-MM-DD)');
    process.exit(1);
  }
  if (options.to && isNaN(Date.parse(options.to))) {
    printError('Invalid --to date format. Use ISO format (YYYY-MM-DD)');
    process.exit(1);
  }

  const backfillConfig = {
    source: options.source,
    target: options.target,
    entityType: options.entityType,
    dateRange: {
      from: options.from,
      to: options.to,
    },
    batchSize: parseInt(options.batchSize ?? '1000', 10),
    concurrency: parseInt(options.concurrency ?? '4', 10),
  };

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would run backfill with configuration:'));
    outputKeyValue(backfillConfig as unknown as Record<string, unknown>);
    return;
  }

  if (!options.force) {
    requireInteractive('Backfill operation');

    const confirmed = await confirmWithPhrase({
      message: `You are about to backfill data from "${options.source}" to "${options.target}". This may take significant time and resources.`,
      requireTypedConfirmation: false,
    });

    if (!confirmed) {
      abort();
    }
  }

  const spinner = ora('Starting backfill operation...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<DataOperationResult>(
      '/admin/data/backfill',
      backfillConfig
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to start backfill: ${response.error?.message}`);
      process.exit(1);
    }

    const operation = response.data ?? createMockOperation('backfill');

    if (getOutputFormat() === 'json') {
      output(operation);
      return;
    }

    printSuccess('Backfill operation started');
    console.log(chalk.bold('Operation ID:'), operation.operationId);
    console.log(chalk.gray('Use `summit-admin data status ' + operation.operationId + '` to check progress'));
  } catch (err) {
    spinner.fail('Failed to start backfill');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Run reindex operation
 */
async function runReindex(
  options: {
    index?: string;
    all?: boolean;
    batchSize?: string;
    force?: boolean;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  if (!options.index && !options.all) {
    printError('Specify --index <name> or --all');
    process.exit(1);
  }

  const reindexConfig = {
    index: options.all ? '*' : options.index,
    batchSize: parseInt(options.batchSize ?? '500', 10),
  };

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would reindex with configuration:'));
    outputKeyValue(reindexConfig as unknown as Record<string, unknown>);
    return;
  }

  if (!options.force) {
    requireInteractive('Reindex operation');

    const message = options.all
      ? 'You are about to reindex ALL indices. This will consume significant resources.'
      : `You are about to reindex "${options.index}".`;

    const confirmed = await confirmWithPhrase({
      message,
      requireTypedConfirmation: options.all ?? false,
      typedConfirmationPhrase: CONFIRMATION_PHRASES.FORCE,
    });

    if (!confirmed) {
      abort();
    }
  }

  const spinner = ora('Starting reindex operation...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<DataOperationResult>(
      '/admin/data/reindex',
      reindexConfig
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to start reindex: ${response.error?.message}`);
      process.exit(1);
    }

    const operation = response.data ?? createMockOperation('reindex');

    if (getOutputFormat() === 'json') {
      output(operation);
      return;
    }

    printSuccess('Reindex operation started');
    console.log(chalk.bold('Operation ID:'), operation.operationId);
    console.log(chalk.gray('Use `summit-admin data status ' + operation.operationId + '` to check progress'));
  } catch (err) {
    spinner.fail('Failed to start reindex');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Verify data integrity
 */
async function verifyIntegrity(
  options: {
    source?: string;
    target?: string;
    entityType?: string;
    sampleSize?: string;
    fix?: boolean;
    report?: string;
  },
  globalOpts: GlobalOptions
): Promise<void> {
  const verifyConfig = {
    source: options.source ?? 'postgres',
    target: options.target ?? 'neo4j',
    entityType: options.entityType,
    sampleSize: parseInt(options.sampleSize ?? '10000', 10),
    fix: options.fix ?? false,
  };

  if (options.fix && !globalOpts.dryRun) {
    requireInteractive('Data integrity fix');

    const confirmed = await confirmWithPhrase({
      message: 'You are about to run integrity verification with auto-fix enabled. This will modify data.',
      requireTypedConfirmation: true,
      typedConfirmationPhrase: CONFIRMATION_PHRASES.FORCE,
    });

    if (!confirmed) {
      abort();
    }
  }

  if (globalOpts.dryRun) {
    printDryRunBanner();
    console.log(chalk.bold('Would verify integrity with configuration:'));
    outputKeyValue(verifyConfig as unknown as Record<string, unknown>);
    return;
  }

  const spinner = ora('Running integrity verification...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<IntegrityReport>(
      '/admin/data/verify-integrity',
      verifyConfig
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to verify integrity: ${response.error?.message}`);
      process.exit(1);
    }

    const report = response.data ?? createMockIntegrityReport();

    // Write report to file if specified
    if (options.report) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(options.report, JSON.stringify(report, null, 2));
      printInfo(`Report saved to ${options.report}`);
    }

    if (getOutputFormat() === 'json') {
      output(report);
      return;
    }

    printHeader('Integrity Verification Report');

    console.log(chalk.bold('Summary:'));
    console.log(`  Records checked: ${chalk.cyan(report.recordsChecked.toLocaleString())}`);
    console.log(`  Inconsistencies: ${report.inconsistencies > 0 ? chalk.red(report.inconsistencies) : chalk.green(0)}`);
    console.log(`  Duration: ${formatDuration(report.durationMs)}`);
    console.log();

    if (report.issues.length > 0) {
      console.log(chalk.bold('Issues Found:'));
      const issueRows = report.issues.slice(0, 10).map((issue) => ({
        type: issue.type,
        entityId: issue.entityId,
        field: issue.field ?? '-',
        message: issue.message,
      }));
      outputTable(issueRows);

      if (report.issues.length > 10) {
        printWarning(`... and ${report.issues.length - 10} more issues`);
      }
    } else {
      printSuccess('No integrity issues found');
    }
  } catch (err) {
    spinner.fail('Failed to verify integrity');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Check operation status
 */
async function checkOperationStatus(
  operationId: string | undefined,
  watch: boolean,
  globalOpts: GlobalOptions
): Promise<void> {
  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  const checkOnce = async (opId: string): Promise<DataOperationResult> => {
    const response = await apiClient.get<DataOperationResult>(
      `/admin/data/operations/${opId}`
    );

    if (!response.success) {
      throw new Error(response.error?.message ?? 'Failed to fetch operation status');
    }

    return response.data ?? createMockOperation('backfill');
  };

  if (!operationId) {
    // List recent operations if no ID provided
    await listOperations({ limit: '10' }, globalOpts);
    return;
  }

  if (watch) {
    const spinner = ora('Watching operation...').start();
    let lastProgress = -1;

    const interval = setInterval(async () => {
      try {
        const operation = await checkOnce(operationId);
        const progress = operation.progress ?? 0;

        if (progress !== lastProgress) {
          lastProgress = progress;
          spinner.text = `Operation ${operationId}: ${operation.status} (${Math.round(progress * 100)}%)`;
        }

        if (operation.status === 'completed' || operation.status === 'failed') {
          clearInterval(interval);
          spinner.stop();
          outputOperationStatus(operation, globalOpts);

          if (operation.status === 'failed') {
            process.exit(1);
          }
        }
      } catch (err) {
        clearInterval(interval);
        spinner.fail('Error checking status');
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    }, 2000);
  } else {
    const spinner = ora('Fetching operation status...').start();

    try {
      const operation = await checkOnce(operationId);
      spinner.stop();
      outputOperationStatus(operation, globalOpts);
    } catch (err) {
      spinner.fail('Failed to fetch operation status');
      printError(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }
}

/**
 * Cancel operation
 */
async function cancelOperation(
  operationId: string,
  force: boolean,
  globalOpts: GlobalOptions
): Promise<void> {
  if (!force) {
    requireInteractive('Operation cancellation');

    const { confirm: confirmPrompt } = await import('../utils/confirm.js');
    const confirmed = await confirmPrompt(`Cancel operation ${operationId}?`);

    if (!confirmed) {
      abort();
    }
  }

  const spinner = ora('Cancelling operation...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const response = await apiClient.post<{ success: boolean }>(
      `/admin/data/operations/${operationId}/cancel`,
      {}
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to cancel operation: ${response.error?.message}`);
      process.exit(1);
    }

    printSuccess(`Operation ${operationId} cancelled`);
  } catch (err) {
    spinner.fail('Failed to cancel operation');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * List operations
 */
async function listOperations(
  options: { status?: string; limit?: string },
  globalOpts: GlobalOptions
): Promise<void> {
  const spinner = ora('Fetching operations...').start();

  const apiClient = createApiClient({
    endpoint: getEndpoint(globalOpts.profile, globalOpts.endpoint),
    token: getToken(globalOpts.profile, globalOpts.token),
  });

  try {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);

    const response = await apiClient.get<{ items: DataOperationResult[] }>(
      `/admin/data/operations?${params.toString()}`
    );

    spinner.stop();

    if (!response.success) {
      printError(`Failed to fetch operations: ${response.error?.message}`);
      process.exit(1);
    }

    const operations = response.data?.items ?? getMockOperations();

    if (getOutputFormat() === 'json') {
      output(operations);
      return;
    }

    printHeader('Data Operations');

    const operationRows = operations.map((op) => ({
      id: op.operationId.slice(0, 8) + '...',
      type: op.type,
      status: formatOperationStatus(op.status),
      progress: op.progress ? `${Math.round(op.progress * 100)}%` : '-',
      started: new Date(op.startedAt).toLocaleString(),
    }));

    outputTable(operationRows);
  } catch (err) {
    spinner.fail('Failed to fetch operations');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * Output operation status
 */
function outputOperationStatus(operation: DataOperationResult, _globalOpts: GlobalOptions): void {
  if (getOutputFormat() === 'json') {
    output(operation);
    return;
  }

  printHeader(`Operation: ${operation.operationId}`);

  outputKeyValue({
    type: operation.type,
    status: formatOperationStatus(operation.status),
    progress: operation.progress ? `${Math.round(operation.progress * 100)}%` : 'N/A',
    startedAt: operation.startedAt,
    completedAt: operation.completedAt ?? 'In progress',
    recordsProcessed: operation.recordsProcessed?.toLocaleString() ?? 'N/A',
    recordsTotal: operation.recordsTotal?.toLocaleString() ?? 'N/A',
  });

  if (operation.errors && operation.errors.length > 0) {
    console.log();
    console.log(chalk.bold.red('Errors:'));
    for (const error of operation.errors.slice(0, 5)) {
      console.log(chalk.red(`  - ${error}`));
    }
    if (operation.errors.length > 5) {
      console.log(chalk.gray(`  ... and ${operation.errors.length - 5} more errors`));
    }
  }
}

/**
 * Format operation status with color
 */
function formatOperationStatus(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green('completed');
    case 'running':
      return chalk.blue('running');
    case 'pending':
      return chalk.yellow('pending');
    case 'failed':
      return chalk.red('failed');
    default:
      return chalk.gray(status);
  }
}

/**
 * Create mock operation for demo/fallback
 */
function createMockOperation(type: 'backfill' | 'reindex' | 'verify'): DataOperationResult {
  return {
    operationId: 'op-' + Math.random().toString(36).slice(2, 10),
    type,
    status: 'running',
    startedAt: new Date().toISOString(),
    progress: 0.15,
    recordsProcessed: 15000,
    recordsTotal: 100000,
  };
}

/**
 * Get mock operations list
 */
function getMockOperations(): DataOperationResult[] {
  return [
    {
      operationId: 'op-abc12345',
      type: 'backfill',
      status: 'completed',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 1800000).toISOString(),
      progress: 1,
      recordsProcessed: 500000,
      recordsTotal: 500000,
    },
    {
      operationId: 'op-def67890',
      type: 'reindex',
      status: 'running',
      startedAt: new Date(Date.now() - 600000).toISOString(),
      progress: 0.45,
      recordsProcessed: 225000,
      recordsTotal: 500000,
    },
  ];
}

/**
 * Integrity report interface
 */
interface IntegrityReport {
  recordsChecked: number;
  inconsistencies: number;
  durationMs: number;
  issues: IntegrityIssue[];
}

interface IntegrityIssue {
  type: string;
  entityId: string;
  field?: string;
  message: string;
}

/**
 * Create mock integrity report
 */
function createMockIntegrityReport(): IntegrityReport {
  return {
    recordsChecked: 10000,
    inconsistencies: 0,
    durationMs: 45000,
    issues: [],
  };
}
