import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';
import { UsageEvent } from './events';

export interface UsageMeteringService {
  record(event: UsageEvent): Promise<void>;
  recordBatch(events: UsageEvent[]): Promise<void>;
}

export class PostgresUsageMeteringService implements UsageMeteringService {
  private readonly pool = getPostgresPool();

  async record(event: UsageEvent): Promise<void> {
    await this.recordBatch([event]);
  }

  async recordBatch(events: UsageEvent[]): Promise<void> {
    if (!events.length) {
      return;
    }

    const client = await this.pool.connect();
    try {
      const columns = [
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

      const values: unknown[] = [];
      const rows = events.map((event, index) => {
        const baseIndex = index * columns.length;
        values.push(
          event.id,
          event.tenantId,
          event.principalId ?? null,
          event.dimension,
          event.quantity,
          event.unit,
          event.source,
          event.metadata ?? {},
          event.occurredAt,
          event.recordedAt || new Date().toISOString(),
        );

        const placeholders = columns.map((_, colIndex) => `$${baseIndex + colIndex + 1}`);
        return `(${placeholders.join(', ')})`;
      });

      const query = `INSERT INTO usage_events (${columns.join(', ')}) VALUES ${rows.join(', ')}`;
      await client.query(query, values);
    } catch (error) {
      logger.error('Failed to persist usage events', {
        error: error instanceof Error ? error.message : String(error),
        count: events.length,
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
