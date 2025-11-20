/**
 * IntelGraph Time Series Retention Manager
 * Automated data lifecycle and retention policy management
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Pool } from 'pg';
import { RetentionPolicy } from '../models/TimeSeries.js';

export interface DataLifecyclePolicy {
  name: string;
  tableName: string;
  tiers: RetentionTier[];
}

export interface RetentionTier {
  name: string;
  duration: string; // e.g., '7 days', '30 days', '1 year'
  resolution?: string; // Downsampling resolution
  action: 'keep' | 'downsample' | 'archive' | 'delete';
  targetTable?: string; // For archival
}

export interface RetentionJob {
  job_id: number;
  table_name: string;
  drop_after: string;
  schedule_interval: string;
  last_run?: Date;
  next_run?: Date;
  chunks_dropped?: number;
}

export class RetentionManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Add retention policy to automatically drop old data
   */
  async addRetentionPolicy(policy: RetentionPolicy): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT add_retention_policy(
          '${policy.table_name}',
          INTERVAL '${policy.drop_after}',
          if_not_exists => ${policy.if_not_exists !== false}
        )
      `);
      return result.rows[0].add_retention_policy;
    } finally {
      client.release();
    }
  }

  /**
   * Remove retention policy
   */
  async removeRetentionPolicy(tableName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        SELECT remove_retention_policy('${tableName}')
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Get current retention policies
   */
  async getRetentionPolicies(tableName?: string): Promise<RetentionJob[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT
          j.job_id,
          j.hypertable_name as table_name,
          j.config->>'drop_after' as drop_after,
          j.schedule_interval::text,
          j.last_run_started_at as last_run,
          j.next_start as next_run
        FROM timescaledb_information.jobs j
        WHERE j.proc_name = 'policy_retention'
      `;

      if (tableName) {
        query += ` AND j.hypertable_name = '${tableName}'`;
      }

      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Manually drop chunks older than specified interval
   */
  async dropOldChunks(tableName: string, olderThan: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT drop_chunks('${tableName}', INTERVAL '${olderThan}')
      `);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Archive old data to separate table before deletion
   */
  async archiveOldData(
    sourceTable: string,
    archiveTable: string,
    olderThan: string
  ): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create archive table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${archiveTable} (
          LIKE ${sourceTable} INCLUDING ALL
        )
      `);

      // Copy old data to archive
      const result = await client.query(`
        INSERT INTO ${archiveTable}
        SELECT * FROM ${sourceTable}
        WHERE time < NOW() - INTERVAL '${olderThan}'
      `);

      const archivedRows = result.rowCount || 0;

      // Delete from source
      await client.query(`
        DELETE FROM ${sourceTable}
        WHERE time < NOW() - INTERVAL '${olderThan}'
      `);

      await client.query('COMMIT');
      return archivedRows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Implement tiered data lifecycle policy
   */
  async implementLifecyclePolicy(policy: DataLifecyclePolicy): Promise<void> {
    const client = await this.pool.connect();
    try {
      for (const tier of policy.tiers) {
        switch (tier.action) {
          case 'downsample':
            await this.createDownsampledView(
              policy.tableName,
              tier.targetTable || `${policy.tableName}_${tier.name}`,
              tier.duration,
              tier.resolution || '1 hour'
            );
            break;

          case 'archive':
            await this.scheduleArchival(
              policy.tableName,
              tier.targetTable || `${policy.tableName}_archive`,
              tier.duration
            );
            break;

          case 'delete':
            await this.addRetentionPolicy({
              policy_name: `${policy.name}_${tier.name}`,
              table_name: policy.tableName,
              drop_after: tier.duration
            });
            break;
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Create downsampled view for older data
   */
  private async createDownsampledView(
    sourceTable: string,
    targetView: string,
    olderThan: string,
    resolution: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS ${targetView}
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('${resolution}', time) AS bucket,
          metric_name,
          entity_id,
          entity_type,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as sample_count
        FROM ${sourceTable}
        WHERE time < NOW() - INTERVAL '${olderThan}'
        GROUP BY bucket, metric_name, entity_id, entity_type
      `);

      // Add refresh policy
      await client.query(`
        SELECT add_continuous_aggregate_policy(
          '${targetView}',
          start_offset => INTERVAL '${olderThan}',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '1 day'
        )
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Schedule periodic archival job
   */
  private async scheduleArchival(
    sourceTable: string,
    archiveTable: string,
    olderThan: string
  ): Promise<void> {
    // This would integrate with a job scheduler
    // For now, we'll create a stored procedure
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE OR REPLACE PROCEDURE archive_old_data_${sourceTable}()
        LANGUAGE plpgsql
        AS $$
        BEGIN
          INSERT INTO ${archiveTable}
          SELECT * FROM ${sourceTable}
          WHERE time < NOW() - INTERVAL '${olderThan}'
          ON CONFLICT DO NOTHING;

          DELETE FROM ${sourceTable}
          WHERE time < NOW() - INTERVAL '${olderThan}';
        END;
        $$
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Get data size statistics by age
   */
  async getDataSizeByAge(tableName: string): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          CASE
            WHEN age < INTERVAL '7 days' THEN '< 7 days'
            WHEN age < INTERVAL '30 days' THEN '7-30 days'
            WHEN age < INTERVAL '90 days' THEN '30-90 days'
            WHEN age < INTERVAL '1 year' THEN '90 days - 1 year'
            ELSE '> 1 year'
          END as age_bucket,
          COUNT(*) as row_count,
          pg_size_pretty(SUM(pg_column_size(time) +
                             pg_column_size(value) +
                             pg_column_size(tags))::bigint) as estimated_size
        FROM (
          SELECT
            time,
            value,
            tags,
            NOW() - time as age
          FROM ${tableName}
        ) subquery
        GROUP BY age_bucket
        ORDER BY
          CASE age_bucket
            WHEN '< 7 days' THEN 1
            WHEN '7-30 days' THEN 2
            WHEN '30-90 days' THEN 3
            WHEN '90 days - 1 year' THEN 4
            ELSE 5
          END
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Estimate cost savings from retention policy
   */
  async estimateRetentionSavings(
    tableName: string,
    dropAfter: string
  ): Promise<{ rowsToDelete: number; estimatedSizeBytes: number }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as rows_to_delete,
          SUM(pg_column_size(time) +
              pg_column_size(value) +
              pg_column_size(tags) +
              COALESCE(pg_column_size(metadata), 0))::bigint as estimated_size_bytes
        FROM ${tableName}
        WHERE time < NOW() - INTERVAL '${dropAfter}'
      `);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}
