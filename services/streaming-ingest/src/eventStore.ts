import pg from 'pg';
import { createHash } from 'crypto';
import type { Event, EventStoreRecord, Checkpoint } from './types.js';
import type { Logger } from 'pino';

const { Pool } = pg;

export class EventStore {
  private pool: pg.Pool;
  private logger: Logger;

  constructor(connectionString: string, logger: Logger) {
    this.pool = new Pool({ connectionString, max: 20 });
    this.logger = logger.child({ component: 'EventStore' });
  }

  /**
   * Initialize event store schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS event_store (
          id UUID PRIMARY KEY,
          event_type TEXT NOT NULL,
          source TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB NOT NULL,
          provenance JSONB NOT NULL,
          partition INT NOT NULL,
          offset TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          INDEX idx_event_type ON event_store(event_type),
          INDEX idx_source ON event_store(source),
          INDEX idx_timestamp ON event_store(timestamp),
          INDEX idx_partition_offset ON event_store(partition, offset),
          INDEX idx_created_at ON event_store(created_at)
        );

        CREATE TABLE IF NOT EXISTS checkpoints (
          id UUID PRIMARY KEY,
          topic TEXT NOT NULL,
          partition INT NOT NULL,
          offset TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          event_count BIGINT NOT NULL DEFAULT 0,
          hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          INDEX idx_topic_partition ON checkpoints(topic, partition),
          INDEX idx_timestamp ON checkpoints(timestamp)
        );
      `);
      this.logger.info('Event store schema initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Append event to store (append-only, no updates)
   */
  async append(event: Event, partition: number, offset: string): Promise<void> {
    const query = `
      INSERT INTO event_store (
        id, event_type, source, timestamp, data, metadata, provenance, partition, offset
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      event.id,
      event.type,
      event.source,
      event.timestamp,
      JSON.stringify(event.data),
      JSON.stringify(event.metadata),
      JSON.stringify(event.provenance),
      partition,
      offset,
    ];

    await this.pool.query(query, values);
    this.logger.debug({ eventId: event.id, type: event.type }, 'Event appended to store');
  }

  /**
   * Batch append for high throughput
   */
  async batchAppend(events: Array<{ event: Event; partition: number; offset: string }>): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const { event, partition, offset } of events) {
        await client.query(
          `INSERT INTO event_store (
            id, event_type, source, timestamp, data, metadata, provenance, partition, offset
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            event.id,
            event.type,
            event.source,
            event.timestamp,
            JSON.stringify(event.data),
            JSON.stringify(event.metadata),
            JSON.stringify(event.provenance),
            partition,
            offset,
          ]
        );
      }

      await client.query('COMMIT');
      this.logger.info({ count: events.length }, 'Batch appended to store');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get events for replay
   */
  async getEventsForReplay(
    fromOffset: string,
    toOffset?: string,
    filters?: {
      eventTypes?: string[];
      sources?: string[];
      tenantIds?: string[];
    }
  ): Promise<EventStoreRecord[]> {
    let query = 'SELECT * FROM event_store WHERE offset >= $1';
    const params: any[] = [fromOffset];
    let paramIndex = 2;

    if (toOffset) {
      query += ` AND offset <= $${paramIndex}`;
      params.push(toOffset);
      paramIndex++;
    }

    if (filters?.eventTypes && filters.eventTypes.length > 0) {
      query += ` AND event_type = ANY($${paramIndex})`;
      params.push(filters.eventTypes);
      paramIndex++;
    }

    if (filters?.sources && filters.sources.length > 0) {
      query += ` AND source = ANY($${paramIndex})`;
      params.push(filters.sources);
      paramIndex++;
    }

    if (filters?.tenantIds && filters.tenantIds.length > 0) {
      query += ` AND metadata->>'tenantId' = ANY($${paramIndex})`;
      params.push(filters.tenantIds);
      paramIndex++;
    }

    query += ' ORDER BY partition, offset';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Save checkpoint
   */
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const query = `
      INSERT INTO checkpoints (id, topic, partition, offset, timestamp, event_count, hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.pool.query(query, [
      checkpoint.id,
      checkpoint.topic,
      checkpoint.partition,
      checkpoint.offset,
      checkpoint.timestamp,
      checkpoint.eventCount,
      checkpoint.hash,
    ]);

    this.logger.info({ checkpointId: checkpoint.id, topic: checkpoint.topic }, 'Checkpoint saved');
  }

  /**
   * Get checkpoint by ID
   */
  async getCheckpoint(id: string): Promise<Checkpoint | null> {
    const result = await this.pool.query(
      'SELECT * FROM checkpoints WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      topic: row.topic,
      partition: row.partition,
      offset: row.offset,
      timestamp: Number(row.timestamp),
      eventCount: Number(row.event_count),
      hash: row.hash,
    };
  }

  /**
   * Calculate hash for events (for integrity verification)
   */
  calculateHash(events: Event[]): string {
    const hash = createHash('sha256');
    for (const event of events) {
      hash.update(JSON.stringify(event));
    }
    return hash.digest('hex');
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Event store connections closed');
  }
}
