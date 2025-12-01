/**
 * EventStore - Persistent event storage with append-only log
 *
 * Core event store implementation with PostgreSQL backend
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  DomainEvent,
  EventStream,
  EventFilter,
  EventStoreConfig,
  EventStoreStats
} from './types.js';

export class EventStore {
  private pool: Pool;
  private config: EventStoreConfig;
  private logger: pino.Logger;
  private schema: string;

  constructor(config: EventStoreConfig) {
    this.config = config;
    this.schema = config.schema || 'public';
    this.logger = pino({ name: 'EventStore' });
    this.pool = new Pool({
      connectionString: config.connectionString
    });
  }

  /**
   * Initialize event store schema
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing EventStore...');

    const client = await this.pool.connect();
    try {
      // Create events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.events (
          event_id UUID PRIMARY KEY,
          event_type VARCHAR(255) NOT NULL,
          aggregate_id UUID NOT NULL,
          aggregate_type VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          payload JSONB NOT NULL,
          metadata JSONB,
          causation_id UUID,
          correlation_id UUID,
          UNIQUE(aggregate_id, version)
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_aggregate
        ON ${this.schema}.events(aggregate_id, version)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_type
        ON ${this.schema}.events(event_type)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_timestamp
        ON ${this.schema}.events(timestamp)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_correlation
        ON ${this.schema}.events(correlation_id)
      `);

      // Create snapshots table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.snapshots (
          aggregate_id UUID NOT NULL,
          aggregate_type VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          state JSONB NOT NULL,
          PRIMARY KEY(aggregate_id, version)
        )
      `);

      this.logger.info('EventStore initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Append events to the event store
   */
  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion?: number
  ): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check version for optimistic concurrency
      if (expectedVersion !== undefined) {
        const result = await client.query(
          `SELECT MAX(version) as current_version
           FROM ${this.schema}.events
           WHERE aggregate_id = $1`,
          [aggregateId]
        );

        const currentVersion = result.rows[0]?.current_version || 0;
        if (currentVersion !== expectedVersion) {
          throw new Error(
            `Concurrency conflict: expected version ${expectedVersion}, ` +
            `but current version is ${currentVersion}`
          );
        }
      }

      // Insert events
      for (const event of events) {
        await client.query(
          `INSERT INTO ${this.schema}.events (
            event_id, event_type, aggregate_id, aggregate_type,
            version, timestamp, payload, metadata,
            causation_id, correlation_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            event.eventId || uuidv4(),
            event.eventType,
            aggregateId,
            aggregateType,
            event.version,
            event.timestamp,
            JSON.stringify(event.payload),
            event.metadata ? JSON.stringify(event.metadata) : null,
            event.causationId,
            event.correlationId
          ]
        );
      }

      await client.query('COMMIT');

      this.logger.debug(
        { aggregateId, count: events.length },
        'Events appended'
      );
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get event stream for an aggregate
   */
  async getEventStream(
    aggregateId: string,
    fromVersion: number = 0
  ): Promise<EventStream> {
    const result = await this.pool.query(
      `SELECT event_id, event_type, aggregate_id, aggregate_type,
              version, timestamp, payload, metadata,
              causation_id, correlation_id
       FROM ${this.schema}.events
       WHERE aggregate_id = $1 AND version > $2
       ORDER BY version ASC`,
      [aggregateId, fromVersion]
    );

    const events: DomainEvent[] = result.rows.map(row => ({
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      version: row.version,
      timestamp: row.timestamp,
      payload: row.payload,
      metadata: row.metadata,
      causationId: row.causation_id,
      correlationId: row.correlation_id
    }));

    const version = events.length > 0
      ? events[events.length - 1].version
      : 0;

    return {
      aggregateId,
      aggregateType: events[0]?.aggregateType || '',
      events,
      version
    };
  }

  /**
   * Query events with filters
   */
  async queryEvents(filter: EventFilter): Promise<DomainEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.aggregateType) {
      conditions.push(`aggregate_type = $${paramIndex++}`);
      params.push(filter.aggregateType);
    }

    if (filter.aggregateIds && filter.aggregateIds.length > 0) {
      conditions.push(`aggregate_id = ANY($${paramIndex++})`);
      params.push(filter.aggregateIds);
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      params.push(filter.eventTypes);
    }

    if (filter.fromVersion !== undefined) {
      conditions.push(`version >= $${paramIndex++}`);
      params.push(filter.fromVersion);
    }

    if (filter.toVersion !== undefined) {
      conditions.push(`version <= $${paramIndex++}`);
      params.push(filter.toVersion);
    }

    if (filter.fromTimestamp) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filter.fromTimestamp);
    }

    if (filter.toTimestamp) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filter.toTimestamp);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const result = await this.pool.query(
      `SELECT event_id, event_type, aggregate_id, aggregate_type,
              version, timestamp, payload, metadata,
              causation_id, correlation_id
       FROM ${this.schema}.events
       ${whereClause}
       ORDER BY timestamp ASC, version ASC`,
      params
    );

    return result.rows.map(row => ({
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      version: row.version,
      timestamp: row.timestamp,
      payload: row.payload,
      metadata: row.metadata,
      causationId: row.causation_id,
      correlationId: row.correlation_id
    }));
  }

  /**
   * Get all events (for replay)
   */
  async getAllEvents(
    fromTimestamp?: Date,
    batchSize: number = 1000
  ): Promise<AsyncIterable<DomainEvent[]>> {
    const self = this;

    return {
      async *[Symbol.asyncIterator]() {
        let lastTimestamp = fromTimestamp;
        let hasMore = true;

        while (hasMore) {
          const whereClause = lastTimestamp
            ? `WHERE timestamp > $1`
            : '';

          const params = lastTimestamp ? [lastTimestamp] : [];

          const result = await self.pool.query(
            `SELECT event_id, event_type, aggregate_id, aggregate_type,
                    version, timestamp, payload, metadata,
                    causation_id, correlation_id
             FROM ${self.schema}.events
             ${whereClause}
             ORDER BY timestamp ASC
             LIMIT $${params.length + 1}`,
            [...params, batchSize]
          );

          if (result.rows.length === 0) {
            hasMore = false;
            break;
          }

          const events: DomainEvent[] = result.rows.map(row => ({
            eventId: row.event_id,
            eventType: row.event_type,
            aggregateId: row.aggregate_id,
            aggregateType: row.aggregate_type,
            version: row.version,
            timestamp: row.timestamp,
            payload: row.payload,
            metadata: row.metadata,
            causationId: row.causation_id,
            correlationId: row.correlation_id
          }));

          yield events;

          lastTimestamp = events[events.length - 1].timestamp;
          hasMore = result.rows.length === batchSize;
        }
      }
    };
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<EventStoreStats> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT aggregate_id) as total_aggregates,
        MIN(timestamp) as oldest_event,
        MAX(timestamp) as newest_event
      FROM ${this.schema}.events
    `);

    const typeStats = await this.pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM ${this.schema}.events
      GROUP BY event_type
    `);

    const eventsByType: Record<string, number> = {};
    for (const row of typeStats.rows) {
      eventsByType[row.event_type] = parseInt(row.count, 10);
    }

    const stats = result.rows[0];
    const totalEvents = parseInt(stats.total_events, 10);
    const totalAggregates = parseInt(stats.total_aggregates, 10);

    return {
      totalEvents,
      totalAggregates,
      eventsByType,
      averageEventsPerAggregate: totalAggregates > 0
        ? totalEvents / totalAggregates
        : 0,
      oldestEvent: stats.oldest_event,
      newestEvent: stats.newest_event
    };
  }

  /**
   * Close the event store
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('EventStore closed');
  }
}
