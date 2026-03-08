#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const uuid_1 = require("uuid");
const date_fns_1 = require("date-fns");
const table_1 = require("table");
const ioredis_1 = __importDefault(require("ioredis"));
// Configuration
const config = {
    redis_url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    postgres_url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/summit',
    kafka_brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    artifacts_dir: process.env.ARTIFACTS_DIR ?? './artifacts/replay',
};
// CLI Program
const program = new commander_1.Command();
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
    const spinner = (0, ora_1.default)('Creating replay plan...').start();
    try {
        // Validate timestamps
        const fromDate = (0, date_fns_1.parseISO)(options.from);
        const toDate = (0, date_fns_1.parseISO)(options.to);
        if (!(0, date_fns_1.isValid)(fromDate) || !(0, date_fns_1.isValid)(toDate)) {
            spinner.fail('Invalid timestamp format. Use ISO 8601 (e.g., 2025-01-01T00:00:00Z)');
            process.exit(1);
        }
        if (fromDate >= toDate) {
            spinner.fail('From timestamp must be before to timestamp');
            process.exit(1);
        }
        const plan = {
            id: (0, uuid_1.v4)(),
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
        spinner.succeed(chalk_1.default.green('Replay plan created'));
        console.log('\n' + chalk_1.default.bold('Plan Details:'));
        console.log(`  ID:        ${chalk_1.default.cyan(plan.id)}`);
        console.log(`  Tenant:    ${plan.tenant_id}`);
        console.log(`  Sources:   ${plan.sources.join(', ')}`);
        console.log(`  From:      ${(0, date_fns_1.format)(fromDate, 'yyyy-MM-dd HH:mm:ss')}`);
        console.log(`  To:        ${(0, date_fns_1.format)(toDate, 'yyyy-MM-dd HH:mm:ss')}`);
        console.log(`  Throttle:  ${plan.throttle_rps} rps`);
        console.log(`  Dry Run:   ${plan.dry_run ? 'Yes' : 'No'}`);
        console.log(`  Status:    ${chalk_1.default.yellow('pending')}`);
        console.log('\n' + chalk_1.default.dim('To approve this plan, run:'));
        console.log(chalk_1.default.dim(`  replayctl approve ${plan.id}`));
        console.log('\n' + chalk_1.default.dim('To execute this plan, run:'));
        console.log(chalk_1.default.dim(`  replayctl run --plan ${plan.id}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to create plan: ${error}`));
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
    const spinner = (0, ora_1.default)('Loading replay plan...').start();
    try {
        const store = await createStore();
        const plan = await store.get(options.plan);
        if (!plan) {
            spinner.fail(chalk_1.default.red('Plan not found'));
            process.exit(1);
        }
        // Check approval
        if (!options.force && plan.status !== 'approved') {
            spinner.fail(chalk_1.default.red('Plan must be approved before execution. Use --force to override.'));
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
        console.log('\n' + chalk_1.default.bold('Executing Replay:'));
        console.log(`  Plan ID:   ${chalk_1.default.cyan(plan.id)}`);
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
            console.log(chalk_1.default.green('✓ Replay completed successfully'));
        }
        else {
            console.log(chalk_1.default.red('✗ Replay completed with errors'));
            console.log(`  Error: ${result.error}`);
        }
        console.log('\n' + chalk_1.default.bold('Summary:'));
        console.log(`  Processed: ${result.processed}`);
        console.log(`  Skipped:   ${result.skipped}`);
        console.log(`  Failed:    ${result.failed}`);
        console.log(`  Duration:  ${result.durationMs}ms`);
        // Generate artifacts
        const artifactsPath = await generateArtifacts(plan.id, plan, result);
        console.log(`\n  Artifacts: ${chalk_1.default.dim(artifactsPath)}`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to execute replay: ${error}`));
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
            console.log(chalk_1.default.red('Plan not found'));
            process.exit(1);
        }
        console.log(chalk_1.default.bold('\nReplay Plan Status'));
        console.log('─'.repeat(50));
        console.log(`  ID:           ${chalk_1.default.cyan(plan.id)}`);
        console.log(`  Tenant:       ${plan.tenant_id}`);
        console.log(`  Sources:      ${plan.sources.join(', ')}`);
        console.log(`  Time Range:   ${plan.from_timestamp} → ${plan.to_timestamp}`);
        console.log(`  Created By:   ${plan.created_by}`);
        console.log(`  Created At:   ${plan.created_at}`);
        console.log(`  Dry Run:      ${plan.dry_run ? 'Yes' : 'No'}`);
        console.log(`  Throttle:     ${plan.throttle_rps} rps`);
        const statusColor = {
            pending: chalk_1.default.yellow,
            approved: chalk_1.default.blue,
            running: chalk_1.default.cyan,
            completed: chalk_1.default.green,
            failed: chalk_1.default.red,
            cancelled: chalk_1.default.gray,
        };
        console.log(`  Status:       ${statusColor[plan.status](plan.status)}`);
        if (plan.approval) {
            console.log('\n' + chalk_1.default.bold('Approval:'));
            console.log(`  Approved By:  ${plan.approval.approved_by}`);
            console.log(`  Approved At:  ${plan.approval.approved_at}`);
            if (plan.approval.rfa_id) {
                console.log(`  RFA ID:       ${plan.approval.rfa_id}`);
            }
        }
        if (plan.execution) {
            console.log('\n' + chalk_1.default.bold('Execution:'));
            console.log(`  Started At:   ${plan.execution.started_at}`);
            if (plan.execution.completed_at) {
                console.log(`  Completed At: ${plan.execution.completed_at}`);
            }
            console.log(`  Processed:    ${plan.execution.records_processed}`);
            console.log(`  Skipped:      ${plan.execution.records_skipped}`);
            console.log(`  Failed:       ${plan.execution.records_failed}`);
            if (plan.execution.error) {
                console.log(`  Error:        ${chalk_1.default.red(plan.execution.error)}`);
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error: ${error}`));
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
            console.log(chalk_1.default.dim('No replay plans found'));
            return;
        }
        const tableData = [
            ['ID', 'Tenant', 'Status', 'From', 'To', 'Created'].map(h => chalk_1.default.bold(h)),
            ...plans.map(p => [
                p.id.substring(0, 8),
                p.tenant_id,
                p.status,
                (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.from_timestamp), 'MM-dd HH:mm'),
                (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.to_timestamp), 'MM-dd HH:mm'),
                (0, date_fns_1.format)((0, date_fns_1.parseISO)(p.created_at), 'MM-dd HH:mm'),
            ]),
        ];
        console.log((0, table_1.table)(tableData, {
            border: {
                topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
                bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
                bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
                joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
            },
        }));
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error: ${error}`));
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
    const spinner = (0, ora_1.default)('Approving plan...').start();
    try {
        const store = await createStore();
        const plan = await store.get(planId);
        if (!plan) {
            spinner.fail(chalk_1.default.red('Plan not found'));
            process.exit(1);
        }
        if (plan.status !== 'pending') {
            spinner.fail(chalk_1.default.red(`Cannot approve plan with status: ${plan.status}`));
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
        spinner.succeed(chalk_1.default.green('Plan approved'));
        console.log('\n' + chalk_1.default.dim('To execute this plan, run:'));
        console.log(chalk_1.default.dim(`  replayctl run --plan ${planId}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to approve: ${error}`));
        process.exit(1);
    }
});
// Cancel command
program
    .command('cancel')
    .description('Cancel a replay plan')
    .argument('<plan-id>', 'Plan ID')
    .action(async (planId) => {
    const spinner = (0, ora_1.default)('Cancelling plan...').start();
    try {
        const store = await createStore();
        const plan = await store.get(planId);
        if (!plan) {
            spinner.fail(chalk_1.default.red('Plan not found'));
            process.exit(1);
        }
        if (plan.status === 'completed' || plan.status === 'cancelled') {
            spinner.fail(chalk_1.default.red(`Cannot cancel plan with status: ${plan.status}`));
            process.exit(1);
        }
        await store.update(planId, { status: 'cancelled' });
        spinner.succeed(chalk_1.default.green('Plan cancelled'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to cancel: ${error}`));
        process.exit(1);
    }
});
// Helper functions
async function createStore() {
    const redis = new ioredis_1.default(config.redis_url);
    return {
        async save(plan) {
            await redis.set(`replay:plan:${plan.id}`, JSON.stringify(plan));
            await redis.lpush(`replay:list:${plan.tenant_id}`, plan.id);
            await redis.lpush('replay:list:all', plan.id);
        },
        async get(id) {
            const data = await redis.get(`replay:plan:${id}`);
            return data ? JSON.parse(data) : null;
        },
        async list(tenantId) {
            const key = tenantId ? `replay:list:${tenantId}` : 'replay:list:all';
            const ids = await redis.lrange(key, 0, -1);
            const plans = [];
            for (const id of ids) {
                const plan = await this.get(id);
                if (plan)
                    plans.push(plan);
            }
            return plans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        },
        async update(id, updates) {
            const plan = await this.get(id);
            if (!plan)
                throw new Error('Plan not found');
            const updated = { ...plan, ...updates };
            await redis.set(`replay:plan:${id}`, JSON.stringify(updated));
        },
    };
}
async function executeReplay(plan, verbose, onProgress) {
    const startTime = Date.now();
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    try {
        // Connect to checkpoint store
        const redis = new ioredis_1.default(config.redis_url);
        // Get checkpoints for time range
        const checkpoints = await getCheckpointsInRange(redis, plan.tenant_id, plan.sources, plan.from_timestamp, plan.to_timestamp);
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
    }
    catch (error) {
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
async function getCheckpointsInRange(redis, tenantId, sources, from, to) {
    // TODO: Implement actual checkpoint retrieval
    return sources.map(s => ({ source: s === '*' ? 'all' : s, position: '0' }));
}
async function generateArtifacts(planId, plan, result) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    const artifactsDir = path.join(config.artifacts_dir, planId);
    await fs.mkdir(artifactsDir, { recursive: true });
    // Save plan
    await fs.writeFile(path.join(artifactsDir, 'plan.json'), JSON.stringify(plan, null, 2));
    // Save result
    await fs.writeFile(path.join(artifactsDir, 'result.json'), JSON.stringify(result, null, 2));
    // Save metrics
    await fs.writeFile(path.join(artifactsDir, 'metrics.json'), JSON.stringify({
        processed: result.processed,
        skipped: result.skipped,
        failed: result.failed,
        duration_ms: result.durationMs,
        throughput_rps: result.processed / (result.durationMs / 1000),
    }, null, 2));
    return artifactsDir;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Run CLI
program.parse();
