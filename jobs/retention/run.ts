#!/usr/bin/env ts-node

import { pg } from '../../server/src/db/pg';
import { neo } from '../../server/src/db/neo4j';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Gauge } from 'prom-client';

const tracer = trace.getTracer('retention-job', '24.2.0');

// Metrics
const retentionJobRuns = new Counter({
  name: 'retention_job_runs_total',
  help: 'Total retention job runs',
  labelNames: ['mode', 'status'],
});

const retentionRecordsProcessed = new Counter({
  name: 'retention_records_processed_total',
  help: 'Total records processed by retention job',
  labelNames: ['table', 'action', 'policy'],
});

const retentionJobDuration = new Gauge({
  name: 'retention_job_duration_seconds',
  help: 'Duration of last retention job run',
  labelNames: ['mode'],
});

interface RetentionPolicy {
  name: string;
  tableName: string;
  timestampColumn: string;
  retentionDays: number;
  tenantColumn?: string;
  labelColumn?: string;
  labelOverrides?: Record<string, number>;
}

interface RetentionConfig {
  dryRun: boolean;
  batchSize: number;
  maxDeletes: number;
  policies: RetentionPolicy[];
}

// Default retention policies
const DEFAULT_POLICIES: RetentionPolicy[] = [
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

class RetentionJobRunner {
  private config: RetentionConfig;

  constructor(config: RetentionConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    return tracer.startActiveSpan('retention.job_run', async (span: Span) => {
      const startTime = Date.now();

      span.setAttributes({
        dry_run: this.config.dryRun,
        batch_size: this.config.batchSize,
        policies_count: this.config.policies.length,
      });

      try {
        console.log(
          `🗑️  Starting retention job (${this.config.dryRun ? 'DRY RUN' : 'DELETE MODE'})`,
        );

        for (const policy of this.config.policies) {
          await this.processPolicy(policy);
        }

        const duration = (Date.now() - startTime) / 1000;
        retentionJobDuration.set(
          { mode: this.config.dryRun ? 'dry_run' : 'delete' },
          duration,
        );

        retentionJobRuns.inc({
          mode: this.config.dryRun ? 'dry_run' : 'delete',
          status: 'success',
        });

        console.log(
          `✅ Retention job completed successfully in ${duration.toFixed(2)}s`,
        );
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });

        retentionJobRuns.inc({
          mode: this.config.dryRun ? 'dry_run' : 'delete',
          status: 'error',
        });

        console.error('❌ Retention job failed:', error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async processPolicy(policy: RetentionPolicy): Promise<void> {
    return tracer.startActiveSpan(
      'retention.process_policy',
      async (span: Span) => {
        span.setAttributes({
          policy_name: policy.name,
          table: policy.tableName,
          retention_days: policy.retentionDays,
        });

        console.log(`📋 Processing policy: ${policy.name}`);

        try {
          if (
            policy.tableName.startsWith('coherence_') ||
            policy.tableName === 'audit_logs'
          ) {
            await this.processPostgresPolicy(policy);
          } else if (policy.name.includes('signals')) {
            await this.processNeo4jPolicy(policy);
          }
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async processPostgresPolicy(policy: RetentionPolicy): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    console.log(`  📅 Cutoff date: ${cutoffDate.toISOString()}`);

    // Handle label-based overrides
    if (policy.labelColumn && policy.labelOverrides) {
      for (const [label, days] of Object.entries(policy.labelOverrides)) {
        const labelCutoff = new Date();
        labelCutoff.setDate(labelCutoff.getDate() - days);

        await this.processPostgresWithLabel(policy, labelCutoff, label);
      }
    } else {
      await this.processPostgresStandard(policy, cutoffDate);
    }
  }

  private async processPostgresStandard(
    policy: RetentionPolicy,
    cutoffDate: Date,
  ): Promise<void> {
    // Count records to be affected
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM ${policy.tableName} 
      WHERE ${policy.timestampColumn} < $1
      ${policy.tenantColumn ? `AND ${policy.tenantColumn} IS NOT NULL` : ''}
    `;

    const countResult = await pg.oneOrNone(countQuery, [cutoffDate]);
    const recordCount = parseInt(countResult?.count || '0');

    console.log(
      `  📊 Found ${recordCount} records older than ${cutoffDate.toISOString()}`,
    );

    if (recordCount === 0) {
      console.log('  ✅ No records to process');
      return;
    }

    if (recordCount > this.config.maxDeletes) {
      throw new Error(
        `Record count ${recordCount} exceeds max deletes limit ${this.config.maxDeletes}`,
      );
    }

    if (this.config.dryRun) {
      console.log(`  🔍 DRY RUN: Would delete ${recordCount} records`);
      retentionRecordsProcessed.inc(
        {
          table: policy.tableName,
          action: 'dry_run',
          policy: policy.name,
        },
        recordCount,
      );
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

      const result = await pg.oneOrNone(batchDeleteQuery, [
        cutoffDate,
        this.config.batchSize,
      ]);
      const deletedInBatch = result?.rowCount || 0;

      deletedTotal += deletedInBatch;
      batchCount++;

      console.log(
        `  🗑️  Batch ${batchCount}: Deleted ${deletedInBatch} records (Total: ${deletedTotal})`,
      );

      if (deletedInBatch === 0) {
        break; // No more records to delete
      }

      // Brief pause between batches to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    retentionRecordsProcessed.inc(
      {
        table: policy.tableName,
        action: 'delete',
        policy: policy.name,
      },
      deletedTotal,
    );

    console.log(
      `  ✅ Deleted ${deletedTotal} records from ${policy.tableName}`,
    );
  }

  private async processPostgresWithLabel(
    policy: RetentionPolicy,
    cutoffDate: Date,
    label: string,
  ): Promise<void> {
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM ${policy.tableName} 
      WHERE ${policy.timestampColumn} < $1 
        AND ${policy.labelColumn} = $2
    `;

    const countResult = await pg.oneOrNone(countQuery, [cutoffDate, label]);
    const recordCount = parseInt(countResult?.count || '0');

    console.log(
      `  📊 Found ${recordCount} records with label '${label}' older than ${cutoffDate.toISOString()}`,
    );

    if (recordCount === 0) return;

    if (this.config.dryRun) {
      console.log(
        `  🔍 DRY RUN: Would delete ${recordCount} records with label '${label}'`,
      );
      retentionRecordsProcessed.inc(
        {
          table: policy.tableName,
          action: 'dry_run',
          policy: `${policy.name}-${label}`,
        },
        recordCount,
      );
      return;
    }

    const deleteQuery = `
      DELETE FROM ${policy.tableName}
      WHERE ${policy.timestampColumn} < $1 AND ${policy.labelColumn} = $2
    `;

    await pg.oneOrNone(deleteQuery, [cutoffDate, label]);

    retentionRecordsProcessed.inc(
      {
        table: policy.tableName,
        action: 'delete',
        policy: `${policy.name}-${label}`,
      },
      recordCount,
    );

    console.log(`  ✅ Deleted ${recordCount} records with label '${label}'`);
  }

  private async processNeo4jPolicy(policy: RetentionPolicy): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    console.log(`  📅 Neo4j cutoff date: ${cutoffDate.toISOString()}`);

    // Count nodes to be deleted
    const countQuery = `
      MATCH (n:Signal)
      WHERE datetime(n.timestamp) < datetime($cutoffDate)
      RETURN count(n) as count
    `;

    const countResult = await neo.run(countQuery, {
      cutoffDate: cutoffDate.toISOString(),
    });
    const recordCount = countResult.records[0]?.get('count')?.toNumber() || 0;

    console.log(
      `  📊 Found ${recordCount} Signal nodes older than ${cutoffDate.toISOString()}`,
    );

    if (recordCount === 0) {
      console.log('  ✅ No Signal nodes to process');
      return;
    }

    if (this.config.dryRun) {
      console.log(`  🔍 DRY RUN: Would delete ${recordCount} Signal nodes`);
      retentionRecordsProcessed.inc(
        {
          table: 'neo4j_signals',
          action: 'dry_run',
          policy: policy.name,
        },
        recordCount,
      );
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
      const deleteResult = await neo.run(deleteQuery, {
        cutoffDate: cutoffDate.toISOString(),
        batchSize: this.config.batchSize,
      });

      const deletedInBatch =
        deleteResult.records[0]?.get('deleted')?.toNumber() || 0;
      totalDeleted += deletedInBatch;
      batchCount++;

      console.log(
        `  🗑️  Neo4j Batch ${batchCount}: Deleted ${deletedInBatch} nodes (Total: ${totalDeleted})`,
      );

      if (deletedInBatch === 0) break;

      await new Promise((resolve) => setTimeout(resolve, 500)); // Longer pause for Neo4j
    }

    retentionRecordsProcessed.inc(
      {
        table: 'neo4j_signals',
        action: 'delete',
        policy: policy.name,
      },
      totalDeleted,
    );

    console.log(`  ✅ Deleted ${totalDeleted} Signal nodes from Neo4j`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSize = parseInt(
    args.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1] ||
      '1000',
  );
  const maxDeletes = parseInt(
    args.find((arg) => arg.startsWith('--max-deletes='))?.split('=')[1] ||
      '100000',
  );

  const config: RetentionConfig = {
    dryRun,
    batchSize,
    maxDeletes,
    policies: DEFAULT_POLICIES,
  };

  const runner = new RetentionJobRunner(config);

  try {
    await runner.run();
    process.exit(0);
  } catch (error) {
    console.error('Retention job failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { RetentionJobRunner, DEFAULT_POLICIES };
