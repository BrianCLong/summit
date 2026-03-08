#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POLICIES = exports.RetentionJobRunner = void 0;
const pg_1 = require("../../server/src/db/pg");
const neo4j_1 = require("../../server/src/db/neo4j");
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const tracer = api_1.trace.getTracer('retention-job', '24.2.0');
// Metrics
const retentionJobRuns = new prom_client_1.Counter({
    name: 'retention_job_runs_total',
    help: 'Total retention job runs',
    labelNames: ['mode', 'status'],
});
const retentionRecordsProcessed = new prom_client_1.Counter({
    name: 'retention_records_processed_total',
    help: 'Total records processed by retention job',
    labelNames: ['table', 'action', 'policy'],
});
const retentionJobDuration = new prom_client_1.Gauge({
    name: 'retention_job_duration_seconds',
    help: 'Duration of last retention job run',
    labelNames: ['mode'],
});
// Default retention policies
const DEFAULT_POLICIES = [
    {
        name: 'coherence-scores-standard',
        tableName: 'coherence_scores',
        timestampColumn: 'updated_at',
        retentionDays: 365, // standard-365d
        tenantColumn: 'tenant_id',
    },
    {
        name: 'audit-logs-short',
        tableName: 'audit_logs',
        timestampColumn: 'created_at',
        retentionDays: 30, // short-30d for audit
        tenantColumn: 'tenant_id',
        labelColumn: 'retention_label',
        labelOverrides: {
            'short-30d': 30,
            'standard-365d': 365,
        },
    },
];
exports.DEFAULT_POLICIES = DEFAULT_POLICIES;
class RetentionJobRunner {
    config;
    constructor(config) {
        this.config = config;
    }
    async run() {
        await tracer.startActiveSpan('retention.job_run', async (span) => {
            const startTime = Date.now();
            span.setAttributes({
                dry_run: this.config.dryRun,
                batch_size: this.config.batchSize,
                policies_count: this.config.policies.length,
            });
            try {
                process.stdout.write(`🗑️  Starting retention job (${this.config.dryRun ? 'DRY RUN' : 'DELETE MODE'})\n`);
                for (const policy of this.config.policies) {
                    await this.processPolicy(policy);
                }
                const duration = (Date.now() - startTime) / 1000;
                retentionJobDuration.set({ mode: this.config.dryRun ? 'dry_run' : 'delete' }, duration);
                retentionJobRuns.inc({
                    mode: this.config.dryRun ? 'dry_run' : 'delete',
                    status: 'success',
                });
                process.stdout.write(`✅ Retention job completed successfully in ${duration.toFixed(2)}s\n`);
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                retentionJobRuns.inc({
                    mode: this.config.dryRun ? 'dry_run' : 'delete',
                    status: 'error',
                });
                process.stderr.write(`❌ Retention job failed: ${error}\n`);
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async processPolicy(policy) {
        await tracer.startActiveSpan('retention.process_policy', async (span) => {
            span.setAttributes({
                policy_name: policy.name,
                table: policy.tableName,
                retention_days: policy.retentionDays,
            });
            process.stdout.write(`📋 Processing policy: ${policy.name}\n`);
            try {
                if (policy.tableName.startsWith('coherence_') ||
                    policy.tableName === 'audit_logs') {
                    await this.processPostgresPolicy(policy);
                }
                else if (policy.name.includes('signals')) {
                    await this.processNeo4jPolicy(policy);
                }
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async processPostgresPolicy(policy) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        process.stdout.write(`  📅 Cutoff date: ${cutoffDate.toISOString()}\n`);
        // Handle label-based overrides
        if (policy.labelColumn && policy.labelOverrides) {
            for (const [label, days] of Object.entries(policy.labelOverrides)) {
                const labelCutoff = new Date();
                labelCutoff.setDate(labelCutoff.getDate() - days);
                await this.processPostgresWithLabel(policy, labelCutoff, label);
            }
        }
        else {
            await this.processPostgresStandard(policy, cutoffDate);
        }
    }
    async processPostgresStandard(policy, cutoffDate) {
        // Count records to be affected
        const countQuery = `
      SELECT COUNT(*) as count 
      FROM ${policy.tableName} 
      WHERE ${policy.timestampColumn} < $1
      ${policy.tenantColumn ? `AND ${policy.tenantColumn} IS NOT NULL` : ''}
    `;
        const countResult = await pg_1.pg.oneOrNone(countQuery, [cutoffDate]);
        const recordCount = parseInt(countResult?.count || '0');
        process.stdout.write(`  📊 Found ${recordCount} records older than ${cutoffDate.toISOString()}\n`);
        if (recordCount === 0) {
            process.stdout.write('  ✅ No records to process\n');
            return;
        }
        if (recordCount > this.config.maxDeletes) {
            throw new Error(`Record count ${recordCount} exceeds max deletes limit ${this.config.maxDeletes}`);
        }
        if (this.config.dryRun) {
            process.stdout.write(`  🔍 DRY RUN: Would delete ${recordCount} records\n`);
            retentionRecordsProcessed.inc({
                table: policy.tableName,
                action: 'dry_run',
                policy: policy.name,
            }, recordCount);
            return;
        }
        // Perform deletion in batches
        let deletedTotal = 0;
        let batchCount = 0;
        while (deletedTotal < recordCount) {
            const batchDeleteQuery = `
        DELETE FROM ${policy.tableName}
        WHERE ctid IN (
          SELECT ctid FROM ${policy.tableName}
          WHERE ${policy.timestampColumn} < $1
          LIMIT $2
        )
      `;
            const result = await pg_1.pg.oneOrNone(batchDeleteQuery, [
                cutoffDate,
                this.config.batchSize,
            ]);
            const deletedInBatch = result?.rowCount || 0;
            deletedTotal += deletedInBatch;
            batchCount++;
            process.stdout.write(`  🗑️  Batch ${batchCount}: Deleted ${deletedInBatch} records (Total: ${deletedTotal})\n`);
            if (deletedInBatch === 0) {
                break; // No more records to delete
            }
            // Brief pause between batches to avoid overwhelming the database
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        retentionRecordsProcessed.inc({
            table: policy.tableName,
            action: 'delete',
            policy: policy.name,
        }, deletedTotal);
        process.stdout.write(`  ✅ Deleted ${deletedTotal} records from ${policy.tableName}\n`);
    }
    async processPostgresWithLabel(policy, cutoffDate, label) {
        const countQuery = `
      SELECT COUNT(*) as count 
      FROM ${policy.tableName} 
      WHERE ${policy.timestampColumn} < $1 
        AND ${policy.labelColumn} = $2
    `;
        const countResult = await pg_1.pg.oneOrNone(countQuery, [cutoffDate, label]);
        const recordCount = parseInt(countResult?.count || '0');
        process.stdout.write(`  📊 Found ${recordCount} records with label '${label}' older than ${cutoffDate.toISOString()}\n`);
        if (recordCount === 0) {
            return;
        }
        if (this.config.dryRun) {
            process.stdout.write(`  🔍 DRY RUN: Would delete ${recordCount} records with label '${label}'\n`);
            retentionRecordsProcessed.inc({
                table: policy.tableName,
                action: 'dry_run',
                policy: `${policy.name}-${label}`,
            }, recordCount);
            return;
        }
        const deleteQuery = `
      DELETE FROM ${policy.tableName}
      WHERE ${policy.timestampColumn} < $1 AND ${policy.labelColumn} = $2
    `;
        await pg_1.pg.oneOrNone(deleteQuery, [cutoffDate, label]);
        retentionRecordsProcessed.inc({
            table: policy.tableName,
            action: 'delete',
            policy: `${policy.name}-${label}`,
        }, recordCount);
        process.stdout.write(`  ✅ Deleted ${recordCount} records with label '${label}'\n`);
    }
    async processNeo4jPolicy(policy) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        process.stdout.write(`  📅 Neo4j cutoff date: ${cutoffDate.toISOString()}\n`);
        // Count nodes to be deleted
        const countQuery = `
      MATCH (n:Signal)
      WHERE datetime(n.timestamp) < datetime($cutoffDate)
      RETURN count(n) as count
    `;
        const countResult = await neo4j_1.neo.run(countQuery, {
            cutoffDate: cutoffDate.toISOString(),
        });
        const recordCount = countResult.records[0]?.get('count')?.toNumber() || 0;
        process.stdout.write(`  📊 Found ${recordCount} Signal nodes older than ${cutoffDate.toISOString()}\n`);
        if (recordCount === 0) {
            process.stdout.write('  ✅ No Signal nodes to process\n');
            return;
        }
        if (this.config.dryRun) {
            process.stdout.write(`  🔍 DRY RUN: Would delete ${recordCount} Signal nodes\n`);
            retentionRecordsProcessed.inc({
                table: 'neo4j_signals',
                action: 'dry_run',
                policy: policy.name,
            }, recordCount);
            return;
        }
        // Delete in batches
        const deleteQuery = `
      MATCH (n:Signal)
      WHERE datetime(n.timestamp) < datetime($cutoffDate)
      WITH n LIMIT $batchSize
      DETACH DELETE n
      RETURN count(n) as deleted
    `;
        let totalDeleted = 0;
        let batchCount = 0;
        while (totalDeleted < recordCount) {
            const deleteResult = await neo4j_1.neo.run(deleteQuery, {
                cutoffDate: cutoffDate.toISOString(),
                batchSize: this.config.batchSize,
            });
            const deletedInBatch = deleteResult.records[0]?.get('deleted')?.toNumber() || 0;
            totalDeleted += deletedInBatch;
            batchCount++;
            process.stdout.write(`  🗑️  Neo4j Batch ${batchCount}: Deleted ${deletedInBatch} nodes (Total: ${totalDeleted})\n`);
            if (deletedInBatch === 0) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500)); // Longer pause for Neo4j
        }
        retentionRecordsProcessed.inc({
            table: 'neo4j_signals',
            action: 'delete',
            policy: policy.name,
        }, totalDeleted);
        process.stdout.write(`  ✅ Deleted ${totalDeleted} Signal nodes from Neo4j\n`);
    }
}
exports.RetentionJobRunner = RetentionJobRunner;
// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const batchSize = parseInt(args.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1] ||
        '1000');
    const maxDeletes = parseInt(args.find((arg) => arg.startsWith('--max-deletes='))?.split('=')[1] ||
        '100000');
    const config = {
        dryRun,
        batchSize,
        maxDeletes,
        policies: DEFAULT_POLICIES,
    };
    const runner = new RetentionJobRunner(config);
    try {
        await runner.run();
        process.exit(0);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Retention job failed: ${errorMessage}\n`);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${errorMessage}\n`);
    });
}
