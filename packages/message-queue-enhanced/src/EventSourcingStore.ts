import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { Pool } from 'pg';
import { DomainEvent, EventStore, EventSourcedAggregate } from './types';

const logger = pino({ name: 'EventSourcingStore' });
const tracer = trace.getTracer('message-queue-enhanced');

/**
 * Event sourcing store with PostgreSQL backend
 */
export class EventSourcingStore implements EventStore {
  constructor(private pool: Pool) {}

  /**
   * Initialize event store schema
   */
  async initialize(): Promise<void> {
    const span = tracer.startSpan('EventSourcingStore.initialize');

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS event_store (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(255) UNIQUE NOT NULL,
          aggregate_id VARCHAR(255) NOT NULL,
          aggregate_type VARCHAR(255) NOT NULL,
          event_type VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB,
          version INTEGER NOT NULL,
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_event_store_aggregate
          ON event_store (aggregate_id, version);

        CREATE INDEX IF NOT EXISTS idx_event_store_type
          ON event_store (aggregate_type, event_type);

        CREATE INDEX IF NOT EXISTS idx_event_store_timestamp
          ON event_store (timestamp);
      `);

      logger.info('Event store initialized');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Append event to store
   */
  async append(event: DomainEvent): Promise<void> {
    const span = tracer.startSpan('EventSourcingStore.append');

    try {
      await this.pool.query(
        `
        INSERT INTO event_store (
          event_id, aggregate_id, aggregate_type, event_type,
          data, metadata, version, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          event.id,
          event.aggregateId,
          event.aggregateType,
          event.eventType,
          JSON.stringify(event.data),
          JSON.stringify(event.metadata || {}),
          event.version,
          event.timestamp,
        ]
      );

      span.setAttributes({
        eventId: event.id,
        aggregateId: event.aggregateId,
        version: event.version,
      });

      logger.debug({ event: event.eventType, aggregate: event.aggregateId }, 'Event appended');
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get events for an aggregate
   */
  async getEvents(
    aggregateId: string,
    fromVersion: number = 0
  ): Promise<DomainEvent[]> {
    const span = tracer.startSpan('EventSourcingStore.getEvents');

    try {
      const result = await this.pool.query(
        `
        SELECT * FROM event_store
        WHERE aggregate_id = $1 AND version >= $2
        ORDER BY version ASC
        `,
        [aggregateId, fromVersion]
      );

      const events = result.rows.map((row) => ({
        id: row.event_id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventType: row.event_type,
        data: row.data,
        metadata: row.metadata,
        version: row.version,
        timestamp: parseInt(row.timestamp, 10),
      }));

      span.setAttributes({
        aggregateId,
        eventCount: events.length,
      });

      return events;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get all events (for event replay)
   */
  async getAllEvents(fromPosition: number = 0): Promise<DomainEvent[]> {
    const span = tracer.startSpan('EventSourcingStore.getAllEvents');

    try {
      const result = await this.pool.query(
        `
        SELECT * FROM event_store
        WHERE id > $1
        ORDER BY id ASC
        LIMIT 1000
        `,
        [fromPosition]
      );

      const events = result.rows.map((row) => ({
        id: row.event_id,
        aggregateId: row.aggregate_id,
        aggregateType: row.aggregate_type,
        eventType: row.event_type,
        data: row.data,
        metadata: row.metadata,
        version: row.version,
        timestamp: parseInt(row.timestamp, 10),
      }));

      span.setAttribute('eventCount', events.length);

      return events;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Rebuild aggregate from events
   */
  async rebuildAggregate<T extends EventSourcedAggregate>(
    aggregateId: string,
    applyEvent: (aggregate: T, event: DomainEvent) => T,
    initialState: T
  ): Promise<T> {
    const span = tracer.startSpan('EventSourcingStore.rebuildAggregate');

    try {
      const events = await this.getEvents(aggregateId);

      let aggregate = initialState;
      for (const event of events) {
        aggregate = applyEvent(aggregate, event);
      }

      span.setAttributes({
        aggregateId,
        eventCount: events.length,
        version: aggregate.version,
      });

      return aggregate;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create snapshot of aggregate state
   */
  async createSnapshot(aggregateId: string, state: any): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO event_store_snapshots (aggregate_id, state, version, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (aggregate_id) DO UPDATE SET
        state = $2, version = $3, created_at = NOW()
      `,
      [aggregateId, JSON.stringify(state), state.version]
    );

    logger.debug({ aggregateId, version: state.version }, 'Snapshot created');
  }

  /**
   * Get latest snapshot
   */
  async getSnapshot(aggregateId: string): Promise<any | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM event_store_snapshots
      WHERE aggregate_id = $1
      `,
      [aggregateId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].state;
  }
}
