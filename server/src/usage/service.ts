import { getPostgresPool } from '../db/postgres.js';
import { logger as rootLogger } from '../utils/logger.js';
import { UsageEvent } from './events.js';

export interface UsageMeteringService {
  record(event: UsageEvent): Promise<void>;
  recordBatch(events: UsageEvent[]): Promise<void>;
}

export class PostgresUsageMeteringService implements UsageMeteringService {
  private readonly pool = getPostgresPool();
  private readonly logger = rootLogger.child({ module: 'usage-metering' });
  private tableReady: Promise<void> | null = null;

  private readonly insertColumns = [
    'id',
    'tenant_id',
    'principal_id',
    'dimension',
    'quantity',
    'unit',
    'source',
    'metadata',
    'occurred_at',
    'recorded_at',
  ];

  async record(event: UsageEvent): Promise<void> {
    await this.ensureTable();

    try {
      await this.pool.write(this.insertSql, this.toParams(event));
      this.logger.debug(
        { eventId: event.id, tenantId: event.tenantId },
        'Usage event recorded',
      );
    } catch (error: any) {
      this.logger.error(
        { err: error, eventId: event.id, tenantId: event.tenantId },
        'Failed to record usage event',
      );
      throw error;
    }
  }

  async recordBatch(events: UsageEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    await this.ensureTable();

    const params: unknown[] = [];
    const valueGroups = events.map((event, index) => {
      const eventParams = this.toParams(event);
      params.push(...eventParams);

      const offset = index * this.insertColumns.length;
      const placeholders = eventParams.map(
        (_, paramIndex) => `$${offset + paramIndex + 1}`,
      );

      return `(${placeholders.join(', ')})`;
    });

    const query = `${this.insertPrefix} VALUES ${valueGroups.join(', ')} ON CONFLICT (id) DO NOTHING`;

    try {
      await this.pool.withTransaction(async (client) => {
        await client.query(query, params);
      });
      this.logger.debug(
        { count: events.length },
        'Usage events batch recorded',
      );
    } catch (error: any) {
      this.logger.error(
        { err: error, count: events.length },
        'Failed to record usage events batch',
      );
      throw error;
    }
  }

  private async ensureTable(): Promise<void> {
    if (!this.tableReady) {
      this.tableReady = (async () => {
        try {
          await this.pool.write(
            `
              CREATE TABLE IF NOT EXISTS usage_events (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                principal_id TEXT,
                dimension TEXT NOT NULL,
                quantity DOUBLE PRECISION NOT NULL,
                unit TEXT NOT NULL,
                source TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                occurred_at TIMESTAMPTZ NOT NULL,
                recorded_at TIMESTAMPTZ NOT NULL
              );
              CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_dimension
                ON usage_events (tenant_id, dimension, occurred_at);
            `,
          );
        } catch (error: any) {
          this.logger.error(
            { err: error },
            'Failed to ensure usage_events table exists',
          );
          this.tableReady = null;
          throw error;
        }
      })();
    }

    return this.tableReady;
  }

  private get insertPrefix(): string {
    return `INSERT INTO usage_events (${this.insertColumns.join(', ')})`;
  }

  private get insertSql(): string {
    const placeholders = this.insertColumns
      .map((_, index) => `$${index + 1}`)
      .join(', ');
    return `${this.insertPrefix} VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
  }

  private toParams(event: UsageEvent): unknown[] {
    return [
      event.id,
      event.tenantId,
      event.principalId ?? null,
      event.dimension,
      event.quantity,
      event.unit,
      event.source,
      JSON.stringify(event.metadata ?? {}),
      new Date(event.occurredAt),
      new Date(event.recordedAt),
    ];
  }
}
