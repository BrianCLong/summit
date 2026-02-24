// @ts-nocheck
import { Pool, type PoolClient } from 'pg';
import { getPostgresPool } from '../config/database.ts';
import logger from '../utils/logger.ts';

export type TimelineGranularity = 'day' | 'week';

export interface TimelineBucket {
  bucketStart: Date;
  bucketEnd: Date;
  tenantId: string;
  eventType: string;
  level: string;
  serviceId: string | null;
  eventCount: number;
}

export interface RollupRefreshResult {
  windowStart?: Date;
  windowEnd?: Date;
  processedEvents: number;
  dailyBuckets: number;
  weeklyBuckets: number;
}

type QueryablePool = Pick<Pool, 'query' | 'connect'>;

interface AuditColumns {
  timestampColumn: string;
  tenantColumn?: string;
  eventTypeColumn?: string;
  levelColumn?: string;
  serviceIdColumn?: string;
}

interface AggregateRow {
  bucket_start: string;
  bucket_end: string;
  tenant_id: string;
  event_type: string;
  level: string;
  service_id: string | null;
  event_count: number;
  last_event_timestamp: Date | null;
}

export class AuditTimelineRollupService {
  private readonly pool: QueryablePool;
  private readonly logger = logger.child({ module: 'audit-timeline-rollups' });

  constructor(pool?: QueryablePool) {
    this.pool = pool ?? getPostgresPool();
  }

  async refreshRollups(
    options: { from?: Date; to?: Date } = {},
  ): Promise<RollupRefreshResult> {
    const client = await this.pool.connect();
    const startedAt = new Date();

    try {
      await client.query('BEGIN');
      const columns = await this.getAuditColumns(client);

      const windowStart =
        options.from ?? (await this.getWatermark(client, columns));
      const windowEnd = options.to ?? new Date();

      if (!windowStart) {
        await this.updateState(client, startedAt, windowEnd, 0, 'noop', null);
        await client.query('COMMIT');
        return {
          processedEvents: 0,
          dailyBuckets: 0,
          weeklyBuckets: 0,
        };
      }

      const aggregates = await this.aggregateEvents(
        client,
        columns,
        windowStart,
        windowEnd,
      );

      const dailyBuckets = await this.writeRollups(
        client,
        'audit_event_rollups_daily',
        'day',
        aggregates.daily,
      );
      const weeklyBuckets = await this.writeRollups(
        client,
        'audit_event_rollups_weekly',
        'week',
        aggregates.weekly,
      );

      await this.updateState(
        client,
        startedAt,
        windowEnd,
        aggregates.processed,
        'ok',
        null,
      );

      await client.query('COMMIT');
      return {
        windowStart,
        windowEnd,
        processedEvents: aggregates.processed,
        dailyBuckets,
        weeklyBuckets,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      await this.updateState(
        client,
        startedAt,
        options.to ?? new Date(),
        0,
        'error',
        error?.message ?? 'unknown error',
      );
      this.logger.error(
        { err: error?.message ?? error },
        'Failed to refresh audit timeline rollups',
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getTimelineBuckets(params: {
    rangeStart: Date;
    rangeEnd: Date;
    granularity?: TimelineGranularity;
    tenantId?: string;
    eventTypes?: string[];
    levels?: string[];
  }): Promise<TimelineBucket[]> {
    const granularity = params.granularity ?? 'day';
    const useRollups = process.env.TIMELINE_ROLLUPS_V1 === '1';
    if (useRollups) {
      return this.readFromRollups({
        ...params,
        granularity,
      });
    }
    return this.readFromBase({
      ...params,
      granularity,
    });
  }

  private async getAuditColumns(client: PoolClient): Promise<AuditColumns> {
    const { rows } = await client.query<{ column_name: string }>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'audit_events'
    `,
    );
    const names = new Set(rows.map((row: any) => row.column_name));

    const timestampColumn = names.has('timestamp')
      ? '"timestamp"'
      : names.has('created_at')
        ? 'created_at'
        : null;

    if (!timestampColumn) {
      throw new Error(
        'audit_events table is missing a timestamp column for rollups',
      );
    }

    return {
      timestampColumn,
      tenantColumn: names.has('tenant_id') ? 'tenant_id' : undefined,
      eventTypeColumn: names.has('event_type')
        ? 'event_type'
        : names.has('action')
          ? 'action'
          : undefined,
      levelColumn: names.has('level') ? 'level' : undefined,
      serviceIdColumn: names.has('service_id') ? 'service_id' : undefined,
    };
  }

  private async getWatermark(
    client: PoolClient,
    columns: AuditColumns,
  ): Promise<Date | undefined> {
    const state = await client.query<{
      last_processed_at: Date | null;
    }>(
      `
      SELECT last_processed_at
      FROM audit_event_rollup_state
      WHERE rollup_name = 'audit_events'
      FOR UPDATE
    `,
    );

    if (state.rowCount && state.rows[0].last_processed_at) {
      return new Date(state.rows[0].last_processed_at);
    }

    const { rows } = await client.query<{ min_ts: Date | null }>(
      `SELECT MIN(${columns.timestampColumn}) AS min_ts FROM audit_events`,
    );
    const minTs = rows[0]?.min_ts;
    return minTs ? new Date(minTs) : undefined;
  }

  private async aggregateEvents(
    client: PoolClient,
    columns: AuditColumns,
    start: Date,
    end: Date,
  ): Promise<{
    processed: number;
    daily: AggregateRow[];
    weekly: AggregateRow[];
  }> {
    const tenantExpr = columns.tenantColumn
      ? `COALESCE(${columns.tenantColumn}, 'unknown')`
      : `'unknown'`;
    const eventTypeExpr = columns.eventTypeColumn
      ? `COALESCE(${columns.eventTypeColumn}, 'event')`
      : `'event'`;
    const levelExpr = columns.levelColumn
      ? `COALESCE(${columns.levelColumn}, 'info')`
      : `'info'`;
    const serviceExpr = columns.serviceIdColumn
      ? `COALESCE(${columns.serviceIdColumn}, NULL)`
      : 'NULL::text';

    const sourceQuery = `
      SELECT
        ${tenantExpr} AS tenant_id,
        ${eventTypeExpr} AS event_type,
        ${levelExpr} AS level,
        ${serviceExpr} AS service_id,
        ${columns.timestampColumn} AS event_ts
      FROM audit_events
      WHERE ${columns.timestampColumn} >= $1 AND ${columns.timestampColumn} < $2
    `;

    const daily = await client.query<AggregateRow>(
      `
      SELECT
        date_trunc('day', event_ts)::date AS bucket_start,
        (date_trunc('day', event_ts) + INTERVAL '1 day')::date AS bucket_end,
        tenant_id,
        event_type,
        level,
        service_id,
        COUNT(*)::bigint AS event_count,
        MAX(event_ts) AS last_event_timestamp
      FROM (${sourceQuery}) AS src
      GROUP BY 1,2,3,4,5,6
    `,
      [start, end],
    );

    const weekly = await client.query<AggregateRow>(
      `
      SELECT
        date_trunc('week', event_ts)::date AS bucket_start,
        (date_trunc('week', event_ts) + INTERVAL '1 week')::date AS bucket_end,
        tenant_id,
        event_type,
        level,
        service_id,
        COUNT(*)::bigint AS event_count,
        MAX(event_ts) AS last_event_timestamp
      FROM (${sourceQuery}) AS src
      GROUP BY 1,2,3,4,5,6
    `,
      [start, end],
    );

    const processed = daily.rows.reduce(
      (sum, row) => sum + Number(row.event_count ?? 0),
      0,
    );

    return { processed, daily: daily.rows, weekly: weekly.rows };
  }

  private async writeRollups(
    client: PoolClient,
    table: 'audit_event_rollups_daily' | 'audit_event_rollups_weekly',
    granularity: TimelineGranularity,
    rows: AggregateRow[],
  ): Promise<number> {
    if (!rows.length) return 0;

    for (const row of rows) {
      await this.ensurePartition(
        client,
        table,
        granularity,
        row.bucket_start,
        row.bucket_end,
      );
    }

    const columns = [
      'bucket_start',
      'bucket_end',
      'tenant_id',
      'event_type',
      'level',
      'service_id',
      'event_count',
      'last_event_timestamp',
    ];

    const values: unknown[] = [];
    const placeholders = rows.map((row, idx) => {
      const offset = idx * columns.length;
      values.push(
        row.bucket_start,
        row.bucket_end,
        row.tenant_id,
        row.event_type,
        row.level,
        row.service_id,
        Number(row.event_count ?? 0),
        row.last_event_timestamp ? new Date(row.last_event_timestamp) : null,
      );
      const base = Array.from({ length: columns.length }, (_, i) => `$${offset + i + 1}`);
      return `(${base.join(', ')})`;
    });

    const insertSql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (bucket_start, tenant_id, event_type, level)
      DO UPDATE SET
        event_count = ${table}.event_count + EXCLUDED.event_count,
        last_event_timestamp = GREATEST(${table}.last_event_timestamp, EXCLUDED.last_event_timestamp)
    `;

    await client.query(insertSql, values);
    return rows.length;
  }

  private async ensurePartition(
    client: PoolClient,
    table: string,
    granularity: TimelineGranularity,
    bucketStart: string,
    bucketEnd: string,
  ): Promise<void> {
    const suffix = bucketStart.replace(/-/g, '');
    const partitionName = `${table}_${granularity}_${suffix}`;
    const sql = `
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF ${table}
      FOR VALUES FROM ('${bucketStart}') TO ('${bucketEnd}')
    `;
    await client.query(sql);
  }

  private async updateState(
    client: PoolClient,
    startedAt: Date,
    completedAt: Date,
    processed: number,
    status: string,
    lastError: string | null,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO audit_event_rollup_state (
        rollup_name,
        last_processed_at,
        last_run_started_at,
        last_run_completed_at,
        last_run_status,
        last_error,
        rows_processed,
        updated_at
      ) VALUES ('audit_events', $1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (rollup_name) DO UPDATE SET
        last_processed_at = EXCLUDED.last_processed_at,
        last_run_started_at = EXCLUDED.last_run_started_at,
        last_run_completed_at = EXCLUDED.last_run_completed_at,
        last_run_status = EXCLUDED.last_run_status,
        last_error = EXCLUDED.last_error,
        rows_processed = audit_event_rollup_state.rows_processed + EXCLUDED.rows_processed,
        updated_at = NOW()
    `,
      [completedAt, startedAt, completedAt, status, lastError, processed],
    );
  }

  private async readFromRollups(params: {
    rangeStart: Date;
    rangeEnd: Date;
    granularity: TimelineGranularity;
    tenantId?: string;
    eventTypes?: string[];
    levels?: string[];
  }): Promise<TimelineBucket[]> {
    const table =
      params.granularity === 'week'
        ? 'audit_event_rollups_weekly'
        : 'audit_event_rollups_daily';
    const startDate = this.truncateDate(params.rangeStart, params.granularity);
    const endDate = this.truncateDate(params.rangeEnd, params.granularity);

    const conditions = ['bucket_start >= $1', 'bucket_start < $2'];
    const values: unknown[] = [startDate, endDate];

    if (params.tenantId) {
      conditions.push(`tenant_id = $${values.length + 1}`);
      values.push(params.tenantId);
    }

    if (params.eventTypes?.length) {
      conditions.push(`event_type = ANY($${values.length + 1})`);
      values.push(params.eventTypes);
    }

    if (params.levels?.length) {
      conditions.push(`level = ANY($${values.length + 1})`);
      values.push(params.levels);
    }

    const { rows } = await this.pool.query<AggregateRow>(
      `
      SELECT bucket_start, bucket_end, tenant_id, event_type, level, service_id, event_count, last_event_timestamp
      FROM ${table}
      WHERE ${conditions.join(' AND ')}
      ORDER BY bucket_start ASC
    `,
      values,
    );

    return rows.map((row: any) => ({
      bucketStart: new Date(row.bucket_start),
      bucketEnd: new Date(row.bucket_end),
      tenantId: row.tenant_id,
      eventType: row.event_type,
      level: row.level,
      serviceId: row.service_id,
      eventCount: Number(row.event_count ?? 0),
    }));
  }

  private async readFromBase(params: {
    rangeStart: Date;
    rangeEnd: Date;
    granularity: TimelineGranularity;
    tenantId?: string;
    eventTypes?: string[];
    levels?: string[];
  }): Promise<TimelineBucket[]> {
    const client = await this.pool.connect();
    try {
      const columns = await this.getAuditColumns(client);
      const trunc = params.granularity === 'week' ? 'week' : 'day';

      const conditions = [
        `${columns.timestampColumn} >= $1`,
        `${columns.timestampColumn} < $2`,
      ];
      const values: unknown[] = [params.rangeStart, params.rangeEnd];

      if (params.tenantId && columns.tenantColumn) {
        conditions.push(`${columns.tenantColumn} = $${values.length + 1}`);
        values.push(params.tenantId);
      }

      if (params.eventTypes?.length && columns.eventTypeColumn) {
        conditions.push(`${columns.eventTypeColumn} = ANY($${values.length + 1})`);
        values.push(params.eventTypes);
      }

      if (params.levels?.length && columns.levelColumn) {
        conditions.push(`${columns.levelColumn} = ANY($${values.length + 1})`);
        values.push(params.levels);
      }

      const tenantExpr = columns.tenantColumn
        ? `COALESCE(${columns.tenantColumn}, 'unknown')`
        : `'unknown'`;
      const eventTypeExpr = columns.eventTypeColumn
        ? `COALESCE(${columns.eventTypeColumn}, 'event')`
        : `'event'`;
      const levelExpr = columns.levelColumn
        ? `COALESCE(${columns.levelColumn}, 'info')`
        : `'info'`;
      const serviceExpr = columns.serviceIdColumn
        ? columns.serviceIdColumn
        : 'NULL::text';

      const { rows } = await client.query<AggregateRow>(
        `
        SELECT
          date_trunc('${trunc}', ${columns.timestampColumn})::date AS bucket_start,
          (date_trunc('${trunc}', ${columns.timestampColumn}) + INTERVAL '1 ${trunc}')::date AS bucket_end,
          ${tenantExpr} AS tenant_id,
          ${eventTypeExpr} AS event_type,
          ${levelExpr} AS level,
          ${serviceExpr} AS service_id,
          COUNT(*)::bigint AS event_count
        FROM audit_events
        WHERE ${conditions.join(' AND ')}
        GROUP BY 1,2,3,4,5,6
        ORDER BY bucket_start ASC
      `,
        values,
      );

      return rows.map((row: any) => ({
        bucketStart: new Date(row.bucket_start),
        bucketEnd: new Date(row.bucket_end),
        tenantId: row.tenant_id,
        eventType: row.event_type,
        level: row.level,
        serviceId: row.service_id,
        eventCount: Number(row.event_count ?? 0),
      }));
    } finally {
      client.release();
    }
  }

  private truncateDate(date: Date, granularity: TimelineGranularity): Date {
    const copy = new Date(date);
    if (granularity === 'week') {
      const day = copy.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      copy.setUTCDate(copy.getUTCDate() + diff);
      copy.setUTCHours(0, 0, 0, 0);
      return copy;
    }
    copy.setUTCHours(0, 0, 0, 0);
    return copy;
  }
}
