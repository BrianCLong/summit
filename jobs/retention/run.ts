#!/usr/bin/env ts-node

import { randomUUID } from 'crypto';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Gauge } from 'prom-client';
import { pool } from '../../server/src/db/pg';
import { neo } from '../../server/src/db/neo4j';
import { buildDerivedPolicies, DerivedRetentionPolicy } from '../../server/src/privacy/retention';

const tracer = trace.getTracer('retention-job', '24.2.0');

// Metrics
const retentionJobRuns = new Counter({
  name: 'retention_job_runs_total',
  help: 'Total retention job runs',
  labelNames: ['mode', 'status']
});

const retentionRecordsProcessed = new Counter({
  name: 'retention_records_processed_total',
  help: 'Total records processed by retention job',
  labelNames: ['table', 'action', 'policy']
});

const retentionJobDuration = new Gauge({
  name: 'retention_job_duration_seconds',
  help: 'Duration of last retention job run',
  labelNames: ['mode']
});

interface RetentionConfig {
  dryRun: boolean;
  batchSize: number;
  maxDeletes: number;
  policies: DerivedRetentionPolicy[];
}

type PolicyRunStatus = 'running' | 'completed' | 'error';

type RetentionModeLabel = 'dry_run' | 'delete';

class RetentionJobRunner {
  private config: RetentionConfig;
  private runId: string;
  private modeLabel: RetentionModeLabel;

  constructor(config: RetentionConfig) {
    this.config = config;
    this.runId = randomUUID();
    this.modeLabel = config.dryRun ? 'dry_run' : 'delete';
  }

  async run(): Promise<void> {
    return tracer.startActiveSpan('retention.job_run', async (span: Span) => {
      const startTime = Date.now();

      span.setAttributes({
        dry_run: this.config.dryRun,
        batch_size: this.config.batchSize,
        policies_count: this.config.policies.length,
        run_id: this.runId
      });

      console.log(`🗑️  Starting retention job ${this.runId} (${this.config.dryRun ? 'DRY RUN' : 'DELETE MODE'})`);

      try {
        for (const policy of this.config.policies) {
          await this.processPolicy(policy);
        }

        const duration = (Date.now() - startTime) / 1000;
        retentionJobDuration.set({ mode: this.modeLabel }, duration);
        retentionJobRuns.inc({ mode: this.modeLabel, status: 'success' });
        console.log(`✅ Retention job ${this.runId} completed successfully in ${duration.toFixed(2)}s`);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        retentionJobRuns.inc({ mode: this.modeLabel, status: 'error' });
        console.error('❌ Retention job failed:', error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async processPolicy(policy: DerivedRetentionPolicy): Promise<void> {
    return tracer.startActiveSpan('retention.process_policy', async (span: Span) => {
      span.setAttributes({
        policy_name: policy.name,
        table: policy.tableName,
        retention_days: policy.retentionDays,
        retention_tier: policy.retentionTier,
        action: policy.action,
        run_id: this.runId
      });

      const policyRowId = await this.createPolicyRunRecord(policy);

      console.log(`📋 Processing policy: ${policy.name}`);

      try {
        if (policy.tableName.startsWith('neo4j:')) {
          await this.processNeo4jPolicy(policy);
          await this.finalizePolicyRun(policyRowId, 'completed', 0, { skipped: true, reason: 'neo4j-policy-placeholder' });
          return;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        console.log(`  📅 Cutoff date: ${cutoffDate.toISOString()}`);

        let processedRecords = 0;
        if (policy.action === 'anonymize') {
          processedRecords = await this.anonymizeRecords(policy, cutoffDate);
        } else {
          processedRecords = await this.deleteRecords(policy, cutoffDate);
        }

        retentionRecordsProcessed.inc(
          { table: policy.tableName, action: this.config.dryRun ? 'dry_run' : policy.action, policy: policy.name },
          processedRecords
        );

        await this.finalizePolicyRun(policyRowId, 'completed', processedRecords, {
          cutoff: cutoffDate.toISOString(),
          dryRun: this.config.dryRun,
          categories: policy.dataCategories,
          sensitivity: policy.sensitivity
        });

        if (processedRecords === 0) {
          console.log('  ✅ No records to process');
        } else {
          const verb = policy.action === 'anonymize' ? 'Anonymized' : 'Deleted';
          console.log(`  ✅ ${verb} ${processedRecords} records from ${policy.tableName}`);
        }
      } catch (error) {
        await this.finalizePolicyRun(policyRowId, 'error', 0, { dryRun: this.config.dryRun }, error as Error);
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async createPolicyRunRecord(policy: DerivedRetentionPolicy): Promise<string> {
    const { rows } = await pool.query(
      `INSERT INTO privacy_retention_job_runs
         (run_id, policy_name, action, retention_tier, mode, status, details)
       VALUES ($1, $2, $3, $4, $5, 'running', $6::jsonb)
       RETURNING id`,
      [
        this.runId,
        policy.name,
        policy.action,
        policy.retentionTier,
        this.modeLabel,
        JSON.stringify({ table: policy.tableName, categories: policy.dataCategories })
      ]
    );

    return rows[0].id;
  }

  private async finalizePolicyRun(
    policyRunId: string,
    status: PolicyRunStatus,
    recordsProcessed: number,
    extraDetails: Record<string, unknown>,
    error?: Error
  ): Promise<void> {
    const payload = {
      ...extraDetails,
      recordsProcessed,
      error: error?.message || null
    };

    await pool.query(
      `UPDATE privacy_retention_job_runs
         SET status = $2,
             records_processed = $3,
             completed_at = NOW(),
             error = $4,
             details = details || $5::jsonb
       WHERE id = $1`,
      [policyRunId, status, recordsProcessed, error?.message || null, JSON.stringify(payload)]
    );
  }

  private async countEligibleRecords(policy: DerivedRetentionPolicy, cutoffDate: Date): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM ${policy.tableName}
        WHERE ${policy.timestampColumn} < $1`,
      [cutoffDate]
    );

    return rows[0]?.count ?? 0;
  }

  private async fetchBatchIds(policy: DerivedRetentionPolicy, cutoffDate: Date): Promise<string[]> {
    const { rows } = await pool.query(
      `SELECT ${policy.primaryKeyColumn}::text AS id
         FROM ${policy.tableName}
        WHERE ${policy.timestampColumn} < $1
        ORDER BY ${policy.timestampColumn}
        LIMIT $2`,
      [cutoffDate, this.config.batchSize]
    );

    return rows.map(row => row.id as string);
  }

  private async insertTombstones(
    policy: DerivedRetentionPolicy,
    recordIds: string[],
    action: 'delete' | 'anonymize'
  ): Promise<void> {
    if (this.config.dryRun || recordIds.length === 0) return;

    await pool.query(
      `INSERT INTO privacy_tombstones (table_name, primary_key_column, record_id, action, metadata)
       SELECT $1, $2, UNNEST($3::text[]), $4, $5::jsonb
       ON CONFLICT (table_name, primary_key_column, record_id)
       DO UPDATE SET
         action = EXCLUDED.action,
         metadata = privacy_tombstones.metadata || EXCLUDED.metadata,
         created_at = LEAST(privacy_tombstones.created_at, EXCLUDED.created_at)`,
      [
        policy.tableName,
        policy.primaryKeyColumn,
        recordIds,
        action,
        JSON.stringify({ runId: this.runId, retentionTier: policy.retentionTier })
      ]
    );
  }

  private generateAnonymizedValues(policy: DerivedRetentionPolicy, recordId: string): Record<string, string> {
    const token = recordId.replace(/-/g, '').slice(0, 16);
    const values: Record<string, string> = {};

    for (const field of policy.anonymizeFields) {
      const lower = field.toLowerCase();
      if (lower.includes('email')) {
        values[field] = `anonymized+${token}@privacy.invalid`;
      } else if (lower.includes('username') || lower.includes('user')) {
        values[field] = `anon_${token}`;
      } else if (lower.includes('name')) {
        values[field] = 'Redacted';
      } else {
        values[field] = '[REDACTED]';
      }
    }

    return values;
  }

  private async anonymizeRecords(policy: DerivedRetentionPolicy, cutoffDate: Date): Promise<number> {
    const totalRecords = await this.countEligibleRecords(policy, cutoffDate);

    if (totalRecords === 0) {
      return 0;
    }

    if (this.config.dryRun) {
      console.log(`  🔍 DRY RUN: Would anonymize ${totalRecords} records`);
      return totalRecords;
    }

    let processed = 0;

    while (processed < totalRecords) {
      const batchIds = await this.fetchBatchIds(policy, cutoffDate);
      if (batchIds.length === 0) break;

      for (const recordId of batchIds) {
        const anonymizedValues = this.generateAnonymizedValues(policy, recordId);
        const assignments: string[] = [];
        const values: unknown[] = [recordId];
        let placeholderIndex = 2;

        for (const [column, value] of Object.entries(anonymizedValues)) {
          assignments.push(`${column} = $${placeholderIndex}`);
          values.push(value);
          placeholderIndex++;
        }

        if (policy.labelColumn) {
          assignments.push(`${policy.labelColumn} = $${placeholderIndex}`);
          values.push('rtbf-anonymize');
          placeholderIndex++;
        }

        if (policy.expiresColumn) {
          assignments.push(`${policy.expiresColumn} = NULL`);
        }

        if (policy.tombstoneColumn) {
          assignments.push(`${policy.tombstoneColumn} = COALESCE(${policy.tombstoneColumn}, NOW())`);
        }

        assignments.push(`updated_at = NOW()`);

        await pool.query(
          `UPDATE ${policy.tableName}
              SET ${assignments.join(', ')}
            WHERE ${policy.primaryKeyColumn}::text = $1`,
          values
        );
      }

      await this.insertTombstones(policy, batchIds, 'anonymize');
      processed += batchIds.length;

      if (batchIds.length < this.config.batchSize) {
        break;
      }
    }

    return processed;
  }

  private async deleteRecords(policy: DerivedRetentionPolicy, cutoffDate: Date): Promise<number> {
    const totalRecords = await this.countEligibleRecords(policy, cutoffDate);

    if (totalRecords === 0) {
      return 0;
    }

    if (totalRecords > this.config.maxDeletes) {
      throw new Error(`Record count ${totalRecords} exceeds max deletes limit ${this.config.maxDeletes}`);
    }

    if (this.config.dryRun) {
      console.log(`  🔍 DRY RUN: Would delete ${totalRecords} records`);
      return totalRecords;
    }

    let deletedTotal = 0;

    while (deletedTotal < totalRecords) {
      const batchIds = await this.fetchBatchIds(policy, cutoffDate);
      if (batchIds.length === 0) break;

      await this.insertTombstones(policy, batchIds, 'delete');

      const result = await pool.query(
        `DELETE FROM ${policy.tableName}
          WHERE ${policy.primaryKeyColumn}::text = ANY($1::text[])`,
        [batchIds]
      );

      deletedTotal += result.rowCount;

      console.log(
        `  🗑️  Batch ${Math.ceil(deletedTotal / this.config.batchSize)}: Deleted ${result.rowCount} records (Total: ${deletedTotal})`
      );

      if (result.rowCount === 0 || result.rowCount < this.config.batchSize) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return deletedTotal;
  }

  private async processNeo4jPolicy(policy: DerivedRetentionPolicy): Promise<void> {
    const retentionDays = policy.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`  📅 Neo4j cutoff date: ${cutoffDate.toISOString()}`);

    const countResult = await neo.run(
      `MATCH (n:Signal)
       WHERE datetime(n.timestamp) < datetime($cutoffDate)
       RETURN count(n) as count`,
      { cutoffDate: cutoffDate.toISOString() }
    );

    const recordCount = countResult.records[0]?.get('count')?.toNumber() || 0;
    console.log(`  📊 Found ${recordCount} Signal nodes older than ${cutoffDate.toISOString()}`);

    if (recordCount === 0 || this.config.dryRun) {
      if (recordCount > 0) {
        console.log(`  🔍 DRY RUN: Would delete ${recordCount} Signal nodes`);
      } else {
        console.log('  ✅ No Signal nodes to process');
      }
      return;
    }

    const deleteQuery = `
      MATCH (n:Signal)
      WHERE datetime(n.timestamp) < datetime($cutoffDate)
      WITH n LIMIT $batchSize
      DETACH DELETE n
      RETURN count(n) as deleted
    `;

    let totalDeleted = 0;

    while (totalDeleted < recordCount) {
      const deleteResult = await neo.run(deleteQuery, {
        cutoffDate: cutoffDate.toISOString(),
        batchSize: this.config.batchSize
      });

      const deletedInBatch = deleteResult.records[0]?.get('deleted')?.toNumber() || 0;
      totalDeleted += deletedInBatch;
      console.log(`  🗑️  Neo4j Batch: Deleted ${deletedInBatch} nodes (Total: ${totalDeleted})`);

      if (deletedInBatch === 0) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '1000', 10);
  const maxDeletes = parseInt(args.find(arg => arg.startsWith('--max-deletes='))?.split('=')[1] || '100000', 10);

  const policies = buildDerivedPolicies();

  const config: RetentionConfig = {
    dryRun,
    batchSize,
    maxDeletes,
    policies
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

export { RetentionJobRunner };
