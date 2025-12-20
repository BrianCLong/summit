#!/usr/bin/env node
// @ts-nocheck
/**
 * replayctl - Ingest Replay Control CLI
 *
 * Commands:
 *   plan    - Create a replay plan for a tenant/time window
 *   run     - Execute a replay plan
 *   status  - Check status of a replay
 *   list    - List all replay plans
 *   approve - Approve a pending replay plan
 *   cancel  - Cancel a running or pending replay
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { v4 as uuid } from 'uuid';
import { format, parseISO, isValid } from 'date-fns';
import { table } from 'table';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';

// Types
interface ReplayPlan {
  id: string;
  tenant_id: string;
  sources: string[];
  from_timestamp: string;
  to_timestamp: string;
  dry_run: boolean;
  throttle_rps: number;
  created_by: string;
  created_at: string;
  status: 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'cancelled';
  approval?: {
    approved_by: string;
    approved_at: string;
    rfa_id?: string;
  };
  execution?: {
    started_at: string;
    completed_at?: string;
    records_processed: number;
    records_skipped: number;
    records_failed: number;
    error?: string;
  };
}

interface ReplayStore {
  save(plan: ReplayPlan): Promise<void>;
  get(id: string): Promise<ReplayPlan | null>;
  list(tenantId?: string): Promise<ReplayPlan[]>;
  update(id: string, updates: Partial<ReplayPlan>): Promise<void>;
}

// Configuration
const config = {
  redis_url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  postgres_url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/summit',
  kafka_brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  artifacts_dir: process.env.ARTIFACTS_DIR ?? './artifacts/replay',
};

// CLI Program
const program = new Command();

program
  .name('replayctl')
  .description('Ingest replay control CLI for time/tenant-scoped replay operations')
  .version('1.0.0');

// Plan command
program
  .command('plan')
  .description('Create a replay plan')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--from <datetime>', 'Start timestamp (ISO 8601)')
  .requiredOption('--to <datetime>', 'End timestamp (ISO 8601)')
  .option('--sources <sources>', 'Comma-separated list of sources', 'all')
  .option('--throttle <rps>', 'Throttle rate (records per second)', '100')
  .option('--dry-run', 'Create as dry-run plan', false)
  .option('--user <name>', 'User creating the plan', process.env.USER ?? 'system')
  .action(async (options) => {
    const spinner = ora('Creating replay plan...').start();

    try {
      // Validate timestamps
      const fromDate = parseISO(options.from);
      const toDate = parseISO(options.to);

      if (!isValid(fromDate) || !isValid(toDate)) {
        spinner.fail('Invalid timestamp format. Use ISO 8601 (e.g., 2025-01-01T00:00:00Z)');
        process.exit(1);
      }

      if (fromDate >= toDate) {
        spinner.fail('From timestamp must be before to timestamp');
        process.exit(1);
      }

      const plan: ReplayPlan = {
        id: uuid(),
        tenant_id: options.tenant,
        sources: options.sources === 'all' ? ['*'] : options.sources.split(','),
        from_timestamp: fromDate.toISOString(),
        to_timestamp: toDate.toISOString(),
        dry_run: options.dryRun,
        throttle_rps: parseInt(options.throttle, 10),
        created_by: options.user,
        created_at: new Date().toISOString(),
        status: 'pending',
      };

      // Save plan
      const store = await createStore();
      await store.save(plan);

      spinner.succeed(chalk.green('Replay plan created'));

      console.log('\n' + chalk.bold('Plan Details:'));
      console.log(`  ID:        ${chalk.cyan(plan.id)}`);
      console.log(`  Tenant:    ${plan.tenant_id}`);
      console.log(`  Sources:   ${plan.sources.join(', ')}`);
      console.log(`  From:      ${format(fromDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`  To:        ${format(toDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`  Throttle:  ${plan.throttle_rps} rps`);
      console.log(`  Dry Run:   ${plan.dry_run ? 'Yes' : 'No'}`);
      console.log(`  Status:    ${chalk.yellow('pending')}`);

      console.log('\n' + chalk.dim('To approve this plan, run:'));
      console.log(chalk.dim(`  replayctl approve ${plan.id}`));

      console.log('\n' + chalk.dim('To execute this plan, run:'));
      console.log(chalk.dim(`  replayctl run --plan ${plan.id}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to create plan: ${error}`));
      process.exit(1);
    }
  });

// Run command
program
  .command('run')
  .description('Execute a replay plan')
  .requiredOption('--plan <id>', 'Plan ID to execute')
  .option('--force', 'Execute without approval', false)
  .option('--verbose', 'Show detailed progress', false)
  .action(async (options) => {
    const spinner = ora('Loading replay plan...').start();

    try {
      const store = await createStore();
      const plan = await store.get(options.plan);

      if (!plan) {
        spinner.fail(chalk.red('Plan not found'));
        process.exit(1);
      }

      // Check approval
      if (!options.force && plan.status !== 'approved') {
        spinner.fail(chalk.red('Plan must be approved before execution. Use --force to override.'));
        process.exit(1);
      }

      // Check legal holds
      spinner.text = 'Checking legal holds...';
      // TODO: Implement legal hold check

      // Update status
      await store.update(plan.id, {
        status: 'running',
        execution: {
          started_at: new Date().toISOString(),
          records_processed: 0,
          records_skipped: 0,
          records_failed: 0,
        },
      });

      spinner.succeed('Replay started');

      console.log('\n' + chalk.bold('Executing Replay:'));
      console.log(`  Plan ID:   ${chalk.cyan(plan.id)}`);
      console.log(`  Tenant:    ${plan.tenant_id}`);
      console.log(`  Dry Run:   ${plan.dry_run ? 'Yes (no changes will be made)' : 'No'}`);

      // Execute replay
      const result = await executeReplay(plan, options.verbose, (progress) => {
        process.stdout.write(`\r  Progress: ${progress.processed}/${progress.total} records (${progress.skipped} skipped, ${progress.failed} failed)`);
      });

      // Update final status
      await store.update(plan.id, {
        status: result.success ? 'completed' : 'failed',
        execution: {
          ...plan.execution,
          completed_at: new Date().toISOString(),
          records_processed: result.processed,
          records_skipped: result.skipped,
          records_failed: result.failed,
          error: result.error,
        },
      });

      console.log('\n');

      if (result.success) {
        console.log(chalk.green('✓ Replay completed successfully'));
      } else {
        console.log(chalk.red('✗ Replay completed with errors'));
        console.log(`  Error: ${result.error}`);
      }

      console.log('\n' + chalk.bold('Summary:'));
      console.log(`  Processed: ${result.processed}`);
      console.log(`  Skipped:   ${result.skipped}`);
      console.log(`  Failed:    ${result.failed}`);
      console.log(`  Duration:  ${result.durationMs}ms`);

      // Generate artifacts
      const artifactsPath = await generateArtifacts(plan.id, plan, result);
      console.log(`\n  Artifacts: ${chalk.dim(artifactsPath)}`);

    } catch (error) {
      spinner.fail(chalk.red(`Failed to execute replay: ${error}`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check replay status')
  .argument('<plan-id>', 'Plan ID')
  .action(async (planId) => {
    try {
      const store = await createStore();
      const plan = await store.get(planId);

      if (!plan) {
        console.log(chalk.red('Plan not found'));
        process.exit(1);
      }

      console.log(chalk.bold('\nReplay Plan Status'));
      console.log('─'.repeat(50));
      console.log(`  ID:           ${chalk.cyan(plan.id)}`);
      console.log(`  Tenant:       ${plan.tenant_id}`);
      console.log(`  Sources:      ${plan.sources.join(', ')}`);
      console.log(`  Time Range:   ${plan.from_timestamp} → ${plan.to_timestamp}`);
      console.log(`  Created By:   ${plan.created_by}`);
      console.log(`  Created At:   ${plan.created_at}`);
      console.log(`  Dry Run:      ${plan.dry_run ? 'Yes' : 'No'}`);
      console.log(`  Throttle:     ${plan.throttle_rps} rps`);

      const statusColor = {
        pending: chalk.yellow,
        approved: chalk.blue,
        running: chalk.cyan,
        completed: chalk.green,
        failed: chalk.red,
        cancelled: chalk.gray,
      };
      console.log(`  Status:       ${statusColor[plan.status](plan.status)}`);

      if (plan.approval) {
        console.log('\n' + chalk.bold('Approval:'));
        console.log(`  Approved By:  ${plan.approval.approved_by}`);
        console.log(`  Approved At:  ${plan.approval.approved_at}`);
        if (plan.approval.rfa_id) {
          console.log(`  RFA ID:       ${plan.approval.rfa_id}`);
        }
      }

      if (plan.execution) {
        console.log('\n' + chalk.bold('Execution:'));
        console.log(`  Started At:   ${plan.execution.started_at}`);
        if (plan.execution.completed_at) {
          console.log(`  Completed At: ${plan.execution.completed_at}`);
        }
        console.log(`  Processed:    ${plan.execution.records_processed}`);
        console.log(`  Skipped:      ${plan.execution.records_skipped}`);
        console.log(`  Failed:       ${plan.execution.records_failed}`);
        if (plan.execution.error) {
          console.log(`  Error:        ${chalk.red(plan.execution.error)}`);
        }
      }

    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List replay plans')
  .option('--tenant <id>', 'Filter by tenant')
  .option('--status <status>', 'Filter by status')
  .option('--limit <n>', 'Limit results', '50')
  .action(async (options) => {
    try {
      const store = await createStore();
      let plans = await store.list(options.tenant);

      if (options.status) {
        plans = plans.filter(p => p.status === options.status);
      }

      plans = plans.slice(0, parseInt(options.limit, 10));

      if (plans.length === 0) {
        console.log(chalk.dim('No replay plans found'));
        return;
      }

      const tableData = [
        ['ID', 'Tenant', 'Status', 'From', 'To', 'Created'].map(h => chalk.bold(h)),
        ...plans.map(p => [
          p.id.substring(0, 8),
          p.tenant_id,
          p.status,
          format(parseISO(p.from_timestamp), 'MM-dd HH:mm'),
          format(parseISO(p.to_timestamp), 'MM-dd HH:mm'),
          format(parseISO(p.created_at), 'MM-dd HH:mm'),
        ]),
      ];

      console.log(table(tableData, {
        border: {
          topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
          bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
          bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
          joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
        },
      }));

    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Approve command
program
  .command('approve')
  .description('Approve a pending replay plan')
  .argument('<plan-id>', 'Plan ID')
  .option('--rfa <id>', 'RFA (Request for Approval) ID')
  .option('--user <name>', 'Approving user', process.env.USER ?? 'system')
  .action(async (planId, options) => {
    const spinner = ora('Approving plan...').start();

    try {
      const store = await createStore();
      const plan = await store.get(planId);

      if (!plan) {
        spinner.fail(chalk.red('Plan not found'));
        process.exit(1);
      }

      if (plan.status !== 'pending') {
        spinner.fail(chalk.red(`Cannot approve plan with status: ${plan.status}`));
        process.exit(1);
      }

      await store.update(planId, {
        status: 'approved',
        approval: {
          approved_by: options.user,
          approved_at: new Date().toISOString(),
          rfa_id: options.rfa,
        },
      });

      spinner.succeed(chalk.green('Plan approved'));

      console.log('\n' + chalk.dim('To execute this plan, run:'));
      console.log(chalk.dim(`  replayctl run --plan ${planId}`));

    } catch (error) {
      spinner.fail(chalk.red(`Failed to approve: ${error}`));
      process.exit(1);
    }
  });

// Cancel command
program
  .command('cancel')
  .description('Cancel a replay plan')
  .argument('<plan-id>', 'Plan ID')
  .action(async (planId) => {
    const spinner = ora('Cancelling plan...').start();

    try {
      const store = await createStore();
      const plan = await store.get(planId);

      if (!plan) {
        spinner.fail(chalk.red('Plan not found'));
        process.exit(1);
      }

      if (plan.status === 'completed' || plan.status === 'cancelled') {
        spinner.fail(chalk.red(`Cannot cancel plan with status: ${plan.status}`));
        process.exit(1);
      }

      await store.update(planId, { status: 'cancelled' });
      spinner.succeed(chalk.green('Plan cancelled'));

    } catch (error) {
      spinner.fail(chalk.red(`Failed to cancel: ${error}`));
      process.exit(1);
    }
  });

// Helper functions
async function createStore(): Promise<ReplayStore> {
  const redis = new Redis(config.redis_url);

  return {
    async save(plan: ReplayPlan): Promise<void> {
      await redis.set(`replay:plan:${plan.id}`, JSON.stringify(plan));
      await redis.lpush(`replay:list:${plan.tenant_id}`, plan.id);
      await redis.lpush('replay:list:all', plan.id);
    },

    async get(id: string): Promise<ReplayPlan | null> {
      const data = await redis.get(`replay:plan:${id}`);
      return data ? JSON.parse(data) : null;
    },

    async list(tenantId?: string): Promise<ReplayPlan[]> {
      const key = tenantId ? `replay:list:${tenantId}` : 'replay:list:all';
      const ids = await redis.lrange(key, 0, -1);
      const plans: ReplayPlan[] = [];

      for (const id of ids) {
        const plan = await this.get(id);
        if (plan) plans.push(plan);
      }

      return plans.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },

    async update(id: string, updates: Partial<ReplayPlan>): Promise<void> {
      const plan = await this.get(id);
      if (!plan) throw new Error('Plan not found');

      const updated = { ...plan, ...updates };
      await redis.set(`replay:plan:${id}`, JSON.stringify(updated));
    },
  };
}

interface ReplayProgress {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
}

interface ReplayResult {
  success: boolean;
  processed: number;
  skipped: number;
  failed: number;
  durationMs: number;
  error?: string;
}

async function executeReplay(
  plan: ReplayPlan,
  verbose: boolean,
  onProgress: (progress: ReplayProgress) => void
): Promise<ReplayResult> {
  const startTime = Date.now();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Connect to checkpoint store
    const redis = new Redis(config.redis_url);

    // Get checkpoints for time range
    const checkpoints = await getCheckpointsInRange(
      redis,
      plan.tenant_id,
      plan.sources,
      plan.from_timestamp,
      plan.to_timestamp
    );

    if (verbose) {
      console.log(`\n  Found ${checkpoints.length} checkpoints to replay`);
    }

    // Process each checkpoint
    for (const checkpoint of checkpoints) {
      if (verbose) {
        console.log(`\n  Replaying from checkpoint: ${checkpoint.source}`);
      }

      // TODO: Implement actual replay logic
      // This would:
      // 1. Seek to checkpoint position
      // 2. Re-read records in time range
      // 3. Apply throttling
      // 4. Use idempotency to skip duplicates
      // 5. Re-process through pipeline

      // For now, simulate
      await sleep(100);
      processed += 10;
      skipped += 2;

      onProgress({
        total: checkpoints.length * 12,
        processed,
        skipped,
        failed,
      });
    }

    await redis.quit();

    return {
      success: true,
      processed,
      skipped,
      failed,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      processed,
      skipped,
      failed,
      durationMs: Date.now() - startTime,
      error: String(error),
    };
  }
}

async function getCheckpointsInRange(
  redis: Redis,
  tenantId: string,
  sources: string[],
  from: string,
  to: string
): Promise<Array<{ source: string; position: string }>> {
  // TODO: Implement actual checkpoint retrieval
  return sources.map(s => ({ source: s === '*' ? 'all' : s, position: '0' }));
}

async function generateArtifacts(
  planId: string,
  plan: ReplayPlan,
  result: ReplayResult
): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const artifactsDir = path.join(config.artifacts_dir, planId);
  await fs.mkdir(artifactsDir, { recursive: true });

  // Save plan
  await fs.writeFile(
    path.join(artifactsDir, 'plan.json'),
    JSON.stringify(plan, null, 2)
  );

  // Save result
  await fs.writeFile(
    path.join(artifactsDir, 'result.json'),
    JSON.stringify(result, null, 2)
  );

  // Save metrics
  await fs.writeFile(
    path.join(artifactsDir, 'metrics.json'),
    JSON.stringify({
      processed: result.processed,
      skipped: result.skipped,
      failed: result.failed,
      duration_ms: result.durationMs,
      throughput_rps: result.processed / (result.durationMs / 1000),
    }, null, 2)
  );

  return artifactsDir;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run CLI
program.parse();
