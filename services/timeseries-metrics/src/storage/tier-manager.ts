/**
 * Storage Tier Manager
 *
 * Manages hot/warm/cold storage tiers for time-series data,
 * handling data movement, compression, and lifecycle.
 */

import { Pool, PoolClient } from 'pg';
import { Logger } from 'winston';
import {
  StorageTier,
  StorageBackend,
  RetentionPolicy,
  TierConfig,
  parseDuration,
  matchRetentionPolicy,
  PredefinedPolicies,
} from '../models/retention-policy.js';
import { Labels } from '../models/metric-types.js';

// ============================================================================
// STORAGE INTERFACES
// ============================================================================

/**
 * Storage write request
 */
export interface WriteRequest {
  metricName: string;
  labels: Labels;
  timestamp: number;
  value: number;
  tenantId: string;
}

/**
 * Storage read request
 */
export interface ReadRequest {
  metricName: string;
  labels?: Labels;
  startTime: number;
  endTime: number;
  tenantId: string;
  resolution?: string;
  aggregation?: string;
}

/**
 * Storage read result
 */
export interface ReadResult {
  metricName: string;
  labels: Labels;
  dataPoints: Array<{ timestamp: number; value: number }>;
  resolution: string;
  tier: StorageTier;
}

/**
 * Tier statistics
 */
export interface TierStats {
  tier: StorageTier;
  backend: StorageBackend;
  seriesCount: number;
  dataPointCount: number;
  storageBytes: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}

// ============================================================================
// STORAGE TIER MANAGER
// ============================================================================

export class StorageTierManager {
  private pool: Pool;
  private logger: Logger;
  private policies: RetentionPolicy[];

  constructor(pool: Pool, logger: Logger, policies?: RetentionPolicy[]) {
    this.pool = pool;
    this.logger = logger;
    this.policies = policies || PredefinedPolicies;
  }

  /**
   * Initialize storage tables for all tiers
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create TimescaleDB extension if not exists
      await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

      // Create hot tier table
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics_hot (
          time TIMESTAMPTZ NOT NULL,
          tenant_id TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          labels JSONB NOT NULL DEFAULT '{}',
          value DOUBLE PRECISION NOT NULL,
          PRIMARY KEY (time, tenant_id, metric_name, labels)
        )
      `);

      // Convert to hypertable
      await client.query(`
        SELECT create_hypertable('metrics_hot', 'time',
          if_not_exists => TRUE,
          chunk_time_interval => INTERVAL '1 day'
        )
      `);

      // Create warm tier table (downsampled)
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics_warm (
          time TIMESTAMPTZ NOT NULL,
          tenant_id TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          labels JSONB NOT NULL DEFAULT '{}',
          value_avg DOUBLE PRECISION,
          value_min DOUBLE PRECISION,
          value_max DOUBLE PRECISION,
          value_sum DOUBLE PRECISION,
          value_count BIGINT,
          PRIMARY KEY (time, tenant_id, metric_name, labels)
        )
      `);

      await client.query(`
        SELECT create_hypertable('metrics_warm', 'time',
          if_not_exists => TRUE,
          chunk_time_interval => INTERVAL '7 days'
        )
      `);

      // Create cold tier table (highly aggregated)
      await client.query(`
        CREATE TABLE IF NOT EXISTS metrics_cold (
          time TIMESTAMPTZ NOT NULL,
          tenant_id TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          labels JSONB NOT NULL DEFAULT '{}',
          value_avg DOUBLE PRECISION,
          value_min DOUBLE PRECISION,
          value_max DOUBLE PRECISION,
          value_sum DOUBLE PRECISION,
          value_count BIGINT,
          value_p50 DOUBLE PRECISION,
          value_p95 DOUBLE PRECISION,
          value_p99 DOUBLE PRECISION,
          PRIMARY KEY (time, tenant_id, metric_name, labels)
        )
      `);

      await client.query(`
        SELECT create_hypertable('metrics_cold', 'time',
          if_not_exists => TRUE,
          chunk_time_interval => INTERVAL '30 days'
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_hot_tenant
        ON metrics_hot (tenant_id, time DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_hot_metric
        ON metrics_hot (metric_name, time DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_hot_labels
        ON metrics_hot USING GIN (labels)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_warm_tenant
        ON metrics_warm (tenant_id, time DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_warm_metric
        ON metrics_warm (metric_name, time DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_cold_tenant
        ON metrics_cold (tenant_id, time DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_metrics_cold_metric
        ON metrics_cold (metric_name, time DESC)
      `);

      // Create retention policies table
      await client.query(`
        CREATE TABLE IF NOT EXISTS retention_policies (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          config JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create series metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS series_metadata (
          id SERIAL PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          metric_name TEXT NOT NULL,
          labels JSONB NOT NULL DEFAULT '{}',
          first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          retention_policy TEXT NOT NULL DEFAULT 'default',
          UNIQUE (tenant_id, metric_name, labels)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_series_metadata_tenant
        ON series_metadata (tenant_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_series_metadata_metric
        ON series_metadata (metric_name)
      `);

      await client.query('COMMIT');
      this.logger.info('Storage tier tables initialized successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to initialize storage tier tables', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Write metrics to the hot tier
   */
  async write(requests: WriteRequest[]): Promise<void> {
    if (requests.length === 0) return;

    const client = await this.pool.connect();
    try {
      const values = requests.map((req, i) => {
        const offset = i * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      });

      const params = requests.flatMap((req) => [
        new Date(req.timestamp),
        req.tenantId,
        req.metricName,
        JSON.stringify(req.labels),
        req.value,
      ]);

      await client.query(
        `
        INSERT INTO metrics_hot (time, tenant_id, metric_name, labels, value)
        VALUES ${values.join(', ')}
        ON CONFLICT (time, tenant_id, metric_name, labels)
        DO UPDATE SET value = EXCLUDED.value
      `,
        params,
      );

      // Update series metadata
      await this.updateSeriesMetadata(client, requests);
    } finally {
      client.release();
    }
  }

  /**
   * Read metrics from appropriate tier based on time range
   */
  async read(request: ReadRequest): Promise<ReadResult[]> {
    const { metricName, labels, startTime, endTime, tenantId } = request;
    const now = Date.now();

    // Determine which tier(s) to query
    const tiers = this.determineTiers(startTime, endTime, now, metricName, labels || {});

    const results: ReadResult[] = [];
    const client = await this.pool.connect();

    try {
      for (const { tier, tierStartTime, tierEndTime } of tiers) {
        const tableName = this.getTableName(tier);
        const tierResults = await this.queryTier(
          client,
          tableName,
          tier,
          metricName,
          labels || {},
          tierStartTime,
          tierEndTime,
          tenantId,
        );
        results.push(...tierResults);
      }
    } finally {
      client.release();
    }

    return results;
  }

  /**
   * Determine which tiers to query based on time range
   */
  private determineTiers(
    startTime: number,
    endTime: number,
    now: number,
    metricName: string,
    labels: Labels,
  ): Array<{ tier: StorageTier; tierStartTime: number; tierEndTime: number }> {
    const policy = matchRetentionPolicy(metricName, labels, this.policies);
    const tiers: Array<{ tier: StorageTier; tierStartTime: number; tierEndTime: number }> = [];

    let currentTime = endTime;
    let tierBoundary = now;

    for (const tierConfig of policy.tiers) {
      const retentionMs = parseDuration(tierConfig.retentionPeriod);
      const tierStart = tierBoundary - retentionMs;

      if (currentTime > tierStart && startTime < tierBoundary) {
        tiers.push({
          tier: tierConfig.tier,
          tierStartTime: Math.max(startTime, tierStart),
          tierEndTime: Math.min(currentTime, tierBoundary),
        });
      }

      tierBoundary = tierStart;
      currentTime = Math.min(currentTime, tierStart);

      if (currentTime <= startTime) break;
    }

    return tiers;
  }

  /**
   * Query a specific tier
   */
  private async queryTier(
    client: PoolClient,
    tableName: string,
    tier: StorageTier,
    metricName: string,
    labels: Labels,
    startTime: number,
    endTime: number,
    tenantId: string,
  ): Promise<ReadResult[]> {
    let labelConditions = '';
    const params: (string | Date)[] = [
      new Date(startTime),
      new Date(endTime),
      tenantId,
      metricName,
    ];

    if (Object.keys(labels).length > 0) {
      labelConditions = ' AND labels @> $5';
      params.push(JSON.stringify(labels));
    }

    const valueColumn = tier === StorageTier.HOT ? 'value' : 'value_avg';
    const resolution = tier === StorageTier.HOT ? '15s' : tier === StorageTier.WARM ? '1m' : '1h';

    const result = await client.query(
      `
      SELECT
        metric_name,
        labels,
        time,
        ${valueColumn} as value
      FROM ${tableName}
      WHERE time >= $1
        AND time <= $2
        AND tenant_id = $3
        AND metric_name = $4
        ${labelConditions}
      ORDER BY time ASC
    `,
      params,
    );

    // Group by labels
    const grouped = new Map<string, ReadResult>();

    for (const row of result.rows) {
      const labelsKey = JSON.stringify(row.labels);
      if (!grouped.has(labelsKey)) {
        grouped.set(labelsKey, {
          metricName: row.metric_name,
          labels: row.labels,
          dataPoints: [],
          resolution,
          tier,
        });
      }
      grouped.get(labelsKey)!.dataPoints.push({
        timestamp: new Date(row.time).getTime(),
        value: row.value,
      });
    }

    return Array.from(grouped.values());
  }

  /**
   * Get table name for tier
   */
  private getTableName(tier: StorageTier): string {
    switch (tier) {
      case StorageTier.HOT:
        return 'metrics_hot';
      case StorageTier.WARM:
        return 'metrics_warm';
      case StorageTier.COLD:
        return 'metrics_cold';
    }
  }

  /**
   * Update series metadata on write
   */
  private async updateSeriesMetadata(
    client: PoolClient,
    requests: WriteRequest[],
  ): Promise<void> {
    // Deduplicate series
    const series = new Map<string, WriteRequest>();
    for (const req of requests) {
      const key = `${req.tenantId}:${req.metricName}:${JSON.stringify(req.labels)}`;
      series.set(key, req);
    }

    for (const req of series.values()) {
      const policy = matchRetentionPolicy(req.metricName, req.labels, this.policies);

      await client.query(
        `
        INSERT INTO series_metadata (tenant_id, metric_name, labels, retention_policy, last_seen)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (tenant_id, metric_name, labels)
        DO UPDATE SET last_seen = NOW()
      `,
        [req.tenantId, req.metricName, JSON.stringify(req.labels), policy.name],
      );
    }
  }

  /**
   * Get tier statistics
   */
  async getTierStats(tenantId?: string): Promise<TierStats[]> {
    const client = await this.pool.connect();
    try {
      const stats: TierStats[] = [];

      for (const tier of [StorageTier.HOT, StorageTier.WARM, StorageTier.COLD]) {
        const tableName = this.getTableName(tier);
        const tenantCondition = tenantId ? 'WHERE tenant_id = $1' : '';
        const params = tenantId ? [tenantId] : [];

        const result = await client.query(
          `
          SELECT
            COUNT(DISTINCT (metric_name, labels)) as series_count,
            COUNT(*) as data_point_count,
            pg_total_relation_size('${tableName}') as storage_bytes,
            MIN(time) as oldest_timestamp,
            MAX(time) as newest_timestamp
          FROM ${tableName}
          ${tenantCondition}
        `,
          params,
        );

        const row = result.rows[0];
        stats.push({
          tier,
          backend: tier === StorageTier.COLD ? StorageBackend.OBJECT_STORAGE : StorageBackend.TIMESCALEDB,
          seriesCount: parseInt(row.series_count, 10),
          dataPointCount: parseInt(row.data_point_count, 10),
          storageBytes: parseInt(row.storage_bytes, 10),
          oldestTimestamp: row.oldest_timestamp ? new Date(row.oldest_timestamp).getTime() : 0,
          newestTimestamp: row.newest_timestamp ? new Date(row.newest_timestamp).getTime() : 0,
        });
      }

      return stats;
    } finally {
      client.release();
    }
  }

  /**
   * Run downsampling job to move data between tiers
   */
  async runDownsampling(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    for (const policy of this.policies) {
      for (const rule of policy.downsampling) {
        try {
          const count = await this.downsampleData(policy, rule);
          processed += count;
        } catch (error) {
          this.logger.error('Downsampling error', { policy: policy.name, rule, error });
          errors++;
        }
      }
    }

    return { processed, errors };
  }

  /**
   * Downsample data according to rule
   */
  private async downsampleData(
    policy: RetentionPolicy,
    rule: { sourceResolution: string; targetResolution: string; afterAge: string },
  ): Promise<number> {
    const client = await this.pool.connect();
    try {
      const afterAgeMs = parseDuration(rule.afterAge);
      const cutoffTime = new Date(Date.now() - afterAgeMs);
      const targetResolutionMs = parseDuration(rule.targetResolution);

      // Determine source and target tables
      const sourceTier = rule.sourceResolution === '15s' ? StorageTier.HOT : StorageTier.WARM;
      const targetTier = rule.targetResolution === '1m' ? StorageTier.WARM : StorageTier.COLD;

      const sourceTable = this.getTableName(sourceTier);
      const targetTable = this.getTableName(targetTier);

      // Build metric pattern condition
      const patternConditions = policy.metricPatterns
        .map((p) => {
          if (p === '*') return 'TRUE';
          const regex = p.replace(/\*/g, '%').replace(/\?/g, '_');
          return `metric_name LIKE '${regex}'`;
        })
        .join(' OR ');

      // Aggregate and insert into target tier
      const result = await client.query(`
        INSERT INTO ${targetTable} (time, tenant_id, metric_name, labels, value_avg, value_min, value_max, value_sum, value_count)
        SELECT
          time_bucket('${targetResolutionMs}ms', time) as bucket,
          tenant_id,
          metric_name,
          labels,
          AVG(${sourceTier === StorageTier.HOT ? 'value' : 'value_avg'}),
          MIN(${sourceTier === StorageTier.HOT ? 'value' : 'value_min'}),
          MAX(${sourceTier === StorageTier.HOT ? 'value' : 'value_max'}),
          SUM(${sourceTier === StorageTier.HOT ? 'value' : 'value_sum'}),
          ${sourceTier === StorageTier.HOT ? 'COUNT(*)' : 'SUM(value_count)'}
        FROM ${sourceTable}
        WHERE time < $1 AND (${patternConditions})
        GROUP BY bucket, tenant_id, metric_name, labels
        ON CONFLICT (time, tenant_id, metric_name, labels) DO NOTHING
      `, [cutoffTime]);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Run data retention cleanup
   */
  async runRetentionCleanup(): Promise<{ deleted: number }> {
    const client = await this.pool.connect();
    let totalDeleted = 0;

    try {
      for (const policy of this.policies) {
        if (!policy.deleteAfter) continue;

        const deleteAfterMs = parseDuration(policy.deleteAfter);
        const cutoffTime = new Date(Date.now() - deleteAfterMs);

        const patternConditions = policy.metricPatterns
          .map((p) => {
            if (p === '*') return 'TRUE';
            const regex = p.replace(/\*/g, '%').replace(/\?/g, '_');
            return `metric_name LIKE '${regex}'`;
          })
          .join(' OR ');

        for (const tier of [StorageTier.COLD, StorageTier.WARM, StorageTier.HOT]) {
          const tableName = this.getTableName(tier);
          const result = await client.query(
            `DELETE FROM ${tableName} WHERE time < $1 AND (${patternConditions})`,
            [cutoffTime],
          );
          totalDeleted += result.rowCount || 0;
        }
      }
    } finally {
      client.release();
    }

    return { deleted: totalDeleted };
  }
}
