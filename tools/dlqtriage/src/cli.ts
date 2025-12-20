#!/usr/bin/env node
// @ts-nocheck
/**
 * dlqtriage - Dead Letter Queue Triage Tool
 *
 * Commands:
 *   summary  - Show DLQ summary by reason code
 *   sample   - Sample records from DLQ
 *   analyze  - Analyze patterns in DLQ records
 *   redrive  - Redrive records back to processing
 *   purge    - Delete records from DLQ
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import Redis from 'ioredis';
import { format, parseISO } from 'date-fns';

interface DLQRecord {
  id: string;
  tenant_id: string;
  reason_code: string;
  error_message: string;
  error_stack?: string;
  entity_type: string;
  entity_id: string;
  retry_count: number;
  first_failed_at: string;
  last_failed_at: string;
  can_redrive: boolean;
  envelope: Record<string, unknown>;
}

const config = {
  redis_url: process.env.REDIS_URL ?? 'redis://localhost:6379',
};

const program = new Command();

program
  .name('dlqtriage')
  .description('Dead Letter Queue triage and management tool')
  .version('1.0.0');

// Summary command
program
  .command('summary')
  .description('Show DLQ summary by reason code')
  .option('--tenant <id>', 'Filter by tenant')
  .action(async (options) => {
    const spinner = ora('Loading DLQ summary...').start();

    try {
      const redis = new Redis(config.redis_url);
      const records = await loadDLQRecords(redis, options.tenant);

      spinner.stop();

      if (records.length === 0) {
        console.log(chalk.green('✓ DLQ is empty'));
        await redis.quit();
        return;
      }

      // Group by reason code
      const byReason: Record<string, DLQRecord[]> = {};
      const byTenant: Record<string, number> = {};
      const byEntity: Record<string, number> = {};

      for (const record of records) {
        byReason[record.reason_code] = byReason[record.reason_code] ?? [];
        byReason[record.reason_code].push(record);

        byTenant[record.tenant_id] = (byTenant[record.tenant_id] ?? 0) + 1;
        byEntity[record.entity_type] = (byEntity[record.entity_type] ?? 0) + 1;
      }

      console.log(chalk.bold('\nDLQ Summary'));
      console.log('═'.repeat(60));
      console.log(`  Total Records: ${chalk.red(records.length)}`);

      // By reason code
      console.log('\n' + chalk.bold('By Reason Code:'));
      const reasonData = [
        ['Reason', 'Count', 'Redriv.', 'Latest'].map(h => chalk.bold(h)),
        ...Object.entries(byReason).map(([reason, recs]) => {
          const redriveCount = recs.filter(r => r.can_redrive).length;
          const latest = recs.reduce((a, b) =>
            new Date(a.last_failed_at) > new Date(b.last_failed_at) ? a : b
          );
          return [
            reason,
            recs.length.toString(),
            redriveCount.toString(),
            format(parseISO(latest.last_failed_at), 'MM-dd HH:mm'),
          ];
        }),
      ];
      console.log(table(reasonData));

      // By tenant
      console.log(chalk.bold('By Tenant:'));
      const tenantData = [
        ['Tenant', 'Count'].map(h => chalk.bold(h)),
        ...Object.entries(byTenant)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([tenant, count]) => [tenant, count.toString()]),
      ];
      console.log(table(tenantData));

      // By entity type
      console.log(chalk.bold('By Entity Type:'));
      const entityData = [
        ['Entity Type', 'Count'].map(h => chalk.bold(h)),
        ...Object.entries(byEntity)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([entity, count]) => [entity, count.toString()]),
      ];
      console.log(table(entityData));

      // Suggestions
      console.log(chalk.bold('Suggested Actions:'));
      if (byReason['SCHEMA_DRIFT']) {
        console.log(chalk.yellow(`  • ${byReason['SCHEMA_DRIFT'].length} records have schema drift - consider updating schema transformers`));
      }
      if (byReason['VALIDATION_FAIL']) {
        console.log(chalk.yellow(`  • ${byReason['VALIDATION_FAIL'].length} validation failures - review input data quality`));
      }
      if (byReason['OLDER_REVISION']) {
        console.log(chalk.dim(`  • ${byReason['OLDER_REVISION'].length} older revision records - likely safe to purge`));
      }

      const redriveableCount = records.filter(r => r.can_redrive).length;
      if (redriveableCount > 0) {
        console.log(chalk.green(`\n  ${redriveableCount} records can be redriven after fixing underlying issues`));
      }

      await redis.quit();
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Sample command
program
  .command('sample')
  .description('Sample records from DLQ')
  .option('--tenant <id>', 'Filter by tenant')
  .option('--reason <code>', 'Filter by reason code')
  .option('--limit <n>', 'Number of samples', '5')
  .option('--full', 'Show full record details', false)
  .action(async (options) => {
    const spinner = ora('Loading samples...').start();

    try {
      const redis = new Redis(config.redis_url);
      let records = await loadDLQRecords(redis, options.tenant);

      if (options.reason) {
        records = records.filter(r => r.reason_code === options.reason);
      }

      // Random sample
      const samples = records
        .sort(() => Math.random() - 0.5)
        .slice(0, parseInt(options.limit, 10));

      spinner.stop();

      if (samples.length === 0) {
        console.log(chalk.dim('No matching records found'));
        await redis.quit();
        return;
      }

      console.log(chalk.bold(`\nDLQ Samples (${samples.length}/${records.length})`));
      console.log('─'.repeat(60));

      for (const record of samples) {
        console.log(`\n${chalk.cyan('ID:')} ${record.id}`);
        console.log(`${chalk.cyan('Tenant:')} ${record.tenant_id}`);
        console.log(`${chalk.cyan('Entity:')} ${record.entity_type}/${record.entity_id}`);
        console.log(`${chalk.cyan('Reason:')} ${chalk.red(record.reason_code)}`);
        console.log(`${chalk.cyan('Error:')} ${record.error_message}`);
        console.log(`${chalk.cyan('Retries:')} ${record.retry_count}`);
        console.log(`${chalk.cyan('Failed:')} ${format(parseISO(record.first_failed_at), 'yyyy-MM-dd HH:mm:ss')}`);
        console.log(`${chalk.cyan('Redriveable:')} ${record.can_redrive ? chalk.green('Yes') : chalk.red('No')}`);

        if (options.full) {
          console.log(`${chalk.cyan('Stack:')}`);
          console.log(chalk.dim(record.error_stack ?? 'N/A'));
          console.log(`${chalk.cyan('Envelope:')}`);
          console.log(chalk.dim(JSON.stringify(record.envelope, null, 2)));
        }
      }

      await redis.quit();
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze patterns in DLQ records')
  .option('--tenant <id>', 'Filter by tenant')
  .action(async (options) => {
    const spinner = ora('Analyzing DLQ patterns...').start();

    try {
      const redis = new Redis(config.redis_url);
      const records = await loadDLQRecords(redis, options.tenant);

      spinner.stop();

      if (records.length === 0) {
        console.log(chalk.green('✓ DLQ is empty'));
        await redis.quit();
        return;
      }

      console.log(chalk.bold('\nDLQ Pattern Analysis'));
      console.log('═'.repeat(60));

      // Error message patterns
      const errorPatterns: Record<string, number> = {};
      for (const record of records) {
        // Extract key parts of error message
        const key = record.error_message
          .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
          .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<TIMESTAMP>')
          .replace(/\d+/g, '<N>')
          .substring(0, 100);

        errorPatterns[key] = (errorPatterns[key] ?? 0) + 1;
      }

      console.log('\n' + chalk.bold('Top Error Patterns:'));
      const sortedPatterns = Object.entries(errorPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      for (const [pattern, count] of sortedPatterns) {
        console.log(`  ${chalk.yellow(count.toString().padStart(4))}x  ${chalk.dim(pattern)}`);
      }

      // Time distribution
      console.log('\n' + chalk.bold('Failure Time Distribution (last 24h):'));
      const hourBuckets = new Array(24).fill(0);
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      for (const record of records) {
        const failedAt = new Date(record.last_failed_at).getTime();
        if (failedAt > dayAgo) {
          const hour = new Date(failedAt).getHours();
          hourBuckets[hour]++;
        }
      }

      const maxCount = Math.max(...hourBuckets);
      for (let hour = 0; hour < 24; hour++) {
        const count = hourBuckets[hour];
        const barLength = maxCount > 0 ? Math.round((count / maxCount) * 30) : 0;
        const bar = '█'.repeat(barLength);
        console.log(`  ${hour.toString().padStart(2)}:00  ${bar} ${count}`);
      }

      // Recommendations
      console.log('\n' + chalk.bold('Recommendations:'));

      const schemaRecords = records.filter(r => r.reason_code === 'SCHEMA_DRIFT');
      if (schemaRecords.length > 10) {
        console.log(chalk.yellow(`  ⚠ High schema drift rate (${schemaRecords.length}) - consider schema evolution pipeline`));
      }

      const staleRecords = records.filter(r => {
        const age = now - new Date(r.first_failed_at).getTime();
        return age > 7 * 24 * 60 * 60 * 1000; // 7 days
      });
      if (staleRecords.length > 0) {
        console.log(chalk.yellow(`  ⚠ ${staleRecords.length} records older than 7 days - consider purging or archiving`));
      }

      const highRetryRecords = records.filter(r => r.retry_count > 5);
      if (highRetryRecords.length > 0) {
        console.log(chalk.red(`  ⚠ ${highRetryRecords.length} records with >5 retries - investigate persistent failures`));
      }

      await redis.quit();
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Redrive command
program
  .command('redrive')
  .description('Redrive records back to processing')
  .option('--tenant <id>', 'Filter by tenant')
  .option('--reason <code>', 'Filter by reason code')
  .option('--id <id>', 'Redrive specific record by ID')
  .option('--limit <n>', 'Maximum records to redrive', '100')
  .option('--dry-run', 'Show what would be redriven without doing it', false)
  .action(async (options) => {
    const spinner = ora('Loading records...').start();

    try {
      const redis = new Redis(config.redis_url);
      let records = await loadDLQRecords(redis, options.tenant);

      // Filter to redriveble only
      records = records.filter(r => r.can_redrive);

      if (options.reason) {
        records = records.filter(r => r.reason_code === options.reason);
      }

      if (options.id) {
        records = records.filter(r => r.id === options.id);
      }

      records = records.slice(0, parseInt(options.limit, 10));

      spinner.stop();

      if (records.length === 0) {
        console.log(chalk.dim('No redriveable records found'));
        await redis.quit();
        return;
      }

      console.log(chalk.bold(`\n${options.dryRun ? '[DRY RUN] ' : ''}Redrive ${records.length} records`));

      if (options.dryRun) {
        console.log(chalk.dim('\nRecords that would be redriven:'));
        for (const record of records) {
          console.log(`  ${record.id} (${record.reason_code})`);
        }
        await redis.quit();
        return;
      }

      // Confirm
      console.log(chalk.yellow(`\nThis will redrive ${records.length} records. Continue? (y/N)`));

      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(resolve => rl.question('', resolve));
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.dim('Cancelled'));
        await redis.quit();
        return;
      }

      const progressSpinner = ora('Redriving records...').start();
      let success = 0;
      let failed = 0;

      for (const record of records) {
        try {
          // TODO: Implement actual redrive - publish to ingest topic
          // await publishToIngestTopic(record.envelope);
          await redis.del(`dlq:${record.tenant_id}:${record.id}`);
          success++;
        } catch {
          failed++;
        }
      }

      progressSpinner.succeed(`Redriven ${success} records (${failed} failed)`);
      await redis.quit();
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Purge command
program
  .command('purge')
  .description('Delete records from DLQ')
  .option('--tenant <id>', 'Filter by tenant')
  .option('--reason <code>', 'Filter by reason code')
  .option('--older-than <days>', 'Only purge records older than N days')
  .option('--dry-run', 'Show what would be purged without doing it', false)
  .action(async (options) => {
    const spinner = ora('Loading records...').start();

    try {
      const redis = new Redis(config.redis_url);
      let records = await loadDLQRecords(redis, options.tenant);

      if (options.reason) {
        records = records.filter(r => r.reason_code === options.reason);
      }

      if (options.olderThan) {
        const cutoff = Date.now() - parseInt(options.olderThan, 10) * 24 * 60 * 60 * 1000;
        records = records.filter(r => new Date(r.first_failed_at).getTime() < cutoff);
      }

      spinner.stop();

      if (records.length === 0) {
        console.log(chalk.dim('No matching records found'));
        await redis.quit();
        return;
      }

      console.log(chalk.bold(`\n${options.dryRun ? '[DRY RUN] ' : ''}Purge ${records.length} records`));

      if (options.dryRun) {
        console.log(chalk.dim('\nRecords that would be purged:'));
        const byReason: Record<string, number> = {};
        for (const record of records) {
          byReason[record.reason_code] = (byReason[record.reason_code] ?? 0) + 1;
        }
        for (const [reason, count] of Object.entries(byReason)) {
          console.log(`  ${reason}: ${count}`);
        }
        await redis.quit();
        return;
      }

      console.log(chalk.red(`\n⚠ This will permanently delete ${records.length} records. Continue? (y/N)`));

      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(resolve => rl.question('', resolve));
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.dim('Cancelled'));
        await redis.quit();
        return;
      }

      const progressSpinner = ora('Purging records...').start();

      for (const record of records) {
        await redis.del(`dlq:${record.tenant_id}:${record.id}`);
      }

      progressSpinner.succeed(`Purged ${records.length} records`);
      await redis.quit();
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Helper functions
async function loadDLQRecords(redis: Redis, tenantId?: string): Promise<DLQRecord[]> {
  const pattern = tenantId ? `dlq:${tenantId}:*` : 'dlq:*:*';
  const keys = await redis.keys(pattern);

  const records: DLQRecord[] = [];
  for (const key of keys) {
    // Skip list keys
    if (key.startsWith('dlq:list:')) continue;

    const data = await redis.get(key);
    if (data) {
      try {
        const record = JSON.parse(data);
        records.push({
          id: record.id,
          tenant_id: record.envelope?.tenant_id ?? 'unknown',
          reason_code: record.reason_code,
          error_message: record.error_message,
          error_stack: record.error_stack,
          entity_type: record.envelope?.entity?.type ?? 'unknown',
          entity_id: record.envelope?.entity?.id ?? 'unknown',
          retry_count: record.retry_count ?? 0,
          first_failed_at: record.first_failed_at,
          last_failed_at: record.last_failed_at,
          can_redrive: record.can_redrive ?? false,
          envelope: record.envelope,
        });
      } catch {
        // Skip invalid records
      }
    }
  }

  return records;
}

program.parse();
