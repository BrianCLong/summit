import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';
import { UsageEvent } from '../types/usage.js';
import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';
import { PrometheusMetrics } from '../utils/metrics.js';

export class UsageMeteringService {
  private static instance: UsageMeteringService;
  private pool: Pool;
  private metrics: PrometheusMetrics;

  private constructor() {
    this.pool = getPostgresPool();
    this.metrics = new PrometheusMetrics('summit_usage');

    this.metrics.createCounter(
        'events_recorded_total',
        'Total number of usage events recorded',
        ['kind']
    );
  }

  public static getInstance(): UsageMeteringService {
    if (!UsageMeteringService.instance) {
      UsageMeteringService.instance = new UsageMeteringService();
    }
    return UsageMeteringService.instance;
  }

  /**
   * Records a single usage event.
   */
  public async record(event: UsageEvent): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO usage_events (
          id, tenant_id, principal_id, principal_kind, kind, quantity, unit, occurred_at, metadata, correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          event.id || randomUUID(),
          event.tenantId,
          event.principalId || null,
          event.principalKind || null,
          event.kind,
          event.quantity,
          event.unit,
          event.occurredAt || new Date().toISOString(),
          JSON.stringify(event.metadata || {}),
          event.correlationId || null
        ]
      );

      this.metrics.incrementCounter('events_recorded_total', { kind: event.kind });

    } catch (error) {
      logger.error('Failed to record usage event', { error, event });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Records a batch of usage events efficiently.
   */
  public async recordBatch(events: UsageEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      // Basic implementation using transaction and loop.
      // Could be optimized with unnest or multi-row insert if needed for high volume.
      await client.query('BEGIN');
      for (const event of events) {
         await client.query(
        `INSERT INTO usage_events (
          id, tenant_id, principal_id, principal_kind, kind, quantity, unit, occurred_at, metadata, correlation_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          event.id || randomUUID(),
          event.tenantId,
          event.principalId || null,
          event.principalKind || null,
          event.kind,
          event.quantity,
          event.unit,
          event.occurredAt || new Date().toISOString(),
          JSON.stringify(event.metadata || {}),
          event.correlationId || null
        ]
      );
      this.metrics.incrementCounter('events_recorded_total', { kind: event.kind });
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to record batch usage events', { error, count: events.length });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default UsageMeteringService.getInstance();
