/**
 * Event Sourcing Service - Central event store for complete state reconstruction
 * Implements append-only event logging with tamper-proof integrity
 */

import { Pool } from 'pg';
import { randomUUID, createHash } from 'crypto';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ name: 'EventSourcingService' });

// ============================================================================
// TYPES
// ============================================================================

export interface DomainEvent {
  eventId?: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion?: number;
  eventData: Record<string, any>;
  eventMetadata?: Record<string, any>;
  tenantId: string;
  userId: string;
  correlationId?: string;
  causationId?: string;
  legalBasis?: string;
  dataClassification?: string;
  retentionPolicy?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  eventTimestamp?: Date;
}

export interface StoredEvent extends DomainEvent {
  eventId: string;
  aggregateVersion: number;
  eventHash: string;
  previousEventHash?: string;
  createdAt: Date;
}

export interface EventQuery {
  tenantId: string;
  aggregateType?: string;
  aggregateId?: string;
  eventType?: string;
  userId?: string;
  startTime?: Date;
  endTime?: Date;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export interface AggregateSnapshot {
  snapshotId?: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  snapshotData: Record<string, any>;
  snapshotMetadata?: Record<string, any>;
}

// ============================================================================
// EVENT SOURCING SERVICE
// ============================================================================

export class EventSourcingService {
  private lastEventHash: string = '';

  constructor(private pg: Pool) {
    this.initializeLastEventHash();
  }

  /**
   * Initialize the last event hash from the database
   */
  private async initializeLastEventHash(): Promise<void> {
    try {
      const { rows } = await this.pg.query(
        `SELECT event_hash FROM event_store
         ORDER BY event_timestamp DESC, created_at DESC LIMIT 1`,
      );
      if (rows[0]?.event_hash) {
        this.lastEventHash = rows[0].event_hash;
      }
    } catch (error) {
      serviceLogger.warn(
        { error: (error as Error).message },
        'Failed to initialize last event hash',
      );
    }
  }

  /**
   * Append a new event to the event store
   */
  async appendEvent(event: DomainEvent): Promise<StoredEvent> {
    const eventId = event.eventId || randomUUID();

    // Get current version for this aggregate
    const currentVersion = await this.getAggregateVersion(
      event.aggregateType,
      event.aggregateId,
    );
    const newVersion = currentVersion + 1;

    // Calculate event hash for integrity
    const eventHash = this.calculateEventHash({
      eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: newVersion,
      eventData: event.eventData,
      userId: event.userId,
      eventTimestamp: event.eventTimestamp || new Date(),
    });

    const previousEventHash = this.lastEventHash || null;
    this.lastEventHash = eventHash;

    try {
      const { rows } = await this.pg.query(
        `INSERT INTO event_store (
          event_id, event_type, aggregate_type, aggregate_id, aggregate_version,
          event_data, event_metadata, tenant_id, user_id, correlation_id, causation_id,
          legal_basis, data_classification, retention_policy,
          ip_address, user_agent, session_id, request_id,
          event_hash, previous_event_hash, event_timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
          eventId,
          event.eventType,
          event.aggregateType,
          event.aggregateId,
          newVersion,
          JSON.stringify(event.eventData),
          JSON.stringify(event.eventMetadata || {}),
          event.tenantId,
          event.userId,
          event.correlationId || null,
          event.causationId || null,
          event.legalBasis || null,
          event.dataClassification || 'INTERNAL',
          event.retentionPolicy || 'STANDARD',
          event.ipAddress || null,
          event.userAgent || null,
          event.sessionId || null,
          event.requestId || null,
          eventHash,
          previousEventHash,
          event.eventTimestamp || new Date(),
        ],
      );

      const storedEvent = this.mapEventRow(rows[0]);

      serviceLogger.info(
        {
          eventId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          aggregateVersion: newVersion,
        },
        'Event appended to event store',
      );

      // Check if we should create a snapshot (every 100 events)
      if (newVersion % 100 === 0) {
        await this.createSnapshotIfNeeded(
          event.aggregateType,
          event.aggregateId,
          newVersion,
        );
      }

      return storedEvent;
    } catch (error) {
      serviceLogger.error(
        {
          error: (error as Error).message,
          event,
        },
        'Failed to append event',
      );
      throw error;
    }
  }

  /**
   * Append multiple events in a transaction (atomic batch)
   */
  async appendEvents(events: DomainEvent[]): Promise<StoredEvent[]> {
    const client = await this.pg.connect();
    const storedEvents: StoredEvent[] = [];

    try {
      await client.query('BEGIN');

      for (const event of events) {
        const storedEvent = await this.appendEvent(event);
        storedEvents.push(storedEvent);
      }

      await client.query('COMMIT');

      serviceLogger.info(
        { eventCount: events.length },
        'Batch events appended successfully',
      );

      return storedEvents;
    } catch (error) {
      await client.query('ROLLBACK');
      serviceLogger.error(
        { error: (error as Error).message },
        'Failed to append batch events',
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all events for an aggregate (for state reconstruction)
   */
  async getAggregateEvents(
    aggregateType: string,
    aggregateId: string,
    fromVersion: number = 0,
  ): Promise<StoredEvent[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM event_store
       WHERE aggregate_type = $1 AND aggregate_id = $2 AND aggregate_version > $3
       ORDER BY aggregate_version ASC`,
      [aggregateType, aggregateId, fromVersion],
    );

    return rows.map(this.mapEventRow);
  }

  /**
   * Get current version of an aggregate
   */
  async getAggregateVersion(
    aggregateType: string,
    aggregateId: string,
  ): Promise<number> {
    const { rows } = await this.pg.query(
      `SELECT COALESCE(MAX(aggregate_version), 0) as version
       FROM event_store
       WHERE aggregate_type = $1 AND aggregate_id = $2`,
      [aggregateType, aggregateId],
    );

    return parseInt(rows[0]?.version || '0', 10);
  }

  /**
   * Query events with filters
   */
  async queryEvents(query: EventQuery): Promise<StoredEvent[]> {
    const params: any[] = [query.tenantId];
    let sql = `SELECT * FROM event_store WHERE tenant_id = $1`;
    let paramIndex = 2;

    if (query.aggregateType) {
      sql += ` AND aggregate_type = $${paramIndex}`;
      params.push(query.aggregateType);
      paramIndex++;
    }

    if (query.aggregateId) {
      sql += ` AND aggregate_id = $${paramIndex}`;
      params.push(query.aggregateId);
      paramIndex++;
    }

    if (query.eventType) {
      sql += ` AND event_type = $${paramIndex}`;
      params.push(query.eventType);
      paramIndex++;
    }

    if (query.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(query.userId);
      paramIndex++;
    }

    if (query.startTime) {
      sql += ` AND event_timestamp >= $${paramIndex}`;
      params.push(query.startTime);
      paramIndex++;
    }

    if (query.endTime) {
      sql += ` AND event_timestamp <= $${paramIndex}`;
      params.push(query.endTime);
      paramIndex++;
    }

    if (query.correlationId) {
      sql += ` AND correlation_id = $${paramIndex}`;
      params.push(query.correlationId);
      paramIndex++;
    }

    sql += ` ORDER BY event_timestamp DESC, aggregate_version DESC`;

    if (query.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(Math.min(query.limit, 10000));
      paramIndex++;
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(query.offset);
      paramIndex++;
    }

    const { rows } = await this.pg.query(sql, params);
    return rows.map(this.mapEventRow);
  }

  /**
   * Create a snapshot of aggregate state
   */
  async createSnapshot(snapshot: AggregateSnapshot): Promise<void> {
    const snapshotId = snapshot.snapshotId || randomUUID();

    // Get event count for this aggregate up to this version
    const { rows: countRows } = await this.pg.query(
      `SELECT COUNT(*) as count FROM event_store
       WHERE aggregate_type = $1 AND aggregate_id = $2 AND aggregate_version <= $3`,
      [snapshot.aggregateType, snapshot.aggregateId, snapshot.aggregateVersion],
    );

    const eventCount = parseInt(countRows[0]?.count || '0', 10);

    const snapshotHash = this.calculateSnapshotHash({
      snapshotId,
      aggregateType: snapshot.aggregateType,
      aggregateId: snapshot.aggregateId,
      aggregateVersion: snapshot.aggregateVersion,
      snapshotData: snapshot.snapshotData,
    });

    await this.pg.query(
      `INSERT INTO event_snapshots (
        snapshot_id, aggregate_type, aggregate_id, aggregate_version,
        snapshot_data, snapshot_metadata, snapshot_hash, event_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (aggregate_type, aggregate_id, aggregate_version) DO UPDATE
      SET snapshot_data = EXCLUDED.snapshot_data,
          snapshot_metadata = EXCLUDED.snapshot_metadata,
          snapshot_hash = EXCLUDED.snapshot_hash,
          event_count = EXCLUDED.event_count`,
      [
        snapshotId,
        snapshot.aggregateType,
        snapshot.aggregateId,
        snapshot.aggregateVersion,
        JSON.stringify(snapshot.snapshotData),
        JSON.stringify(snapshot.snapshotMetadata || {}),
        snapshotHash,
        eventCount,
      ],
    );

    serviceLogger.info(
      {
        aggregateType: snapshot.aggregateType,
        aggregateId: snapshot.aggregateId,
        aggregateVersion: snapshot.aggregateVersion,
      },
      'Snapshot created',
    );
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  async getLatestSnapshot(
    aggregateType: string,
    aggregateId: string,
  ): Promise<AggregateSnapshot | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM event_snapshots
       WHERE aggregate_type = $1 AND aggregate_id = $2
       ORDER BY aggregate_version DESC
       LIMIT 1`,
      [aggregateType, aggregateId],
    );

    if (!rows[0]) {
      return null;
    }

    const row = rows[0];
    return {
      snapshotId: row.snapshot_id,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      aggregateVersion: row.aggregate_version,
      snapshotData: row.snapshot_data,
      snapshotMetadata: row.snapshot_metadata,
    };
  }

  /**
   * Reconstruct aggregate state from events (with optional snapshot)
   */
  async reconstructAggregate<T>(
    aggregateType: string,
    aggregateId: string,
    reducer: (state: T, event: StoredEvent) => T,
    initialState: T,
  ): Promise<{ state: T; version: number }> {
    // Try to get latest snapshot first
    const snapshot = await this.getLatestSnapshot(aggregateType, aggregateId);

    let state: T = initialState;
    let fromVersion = 0;

    if (snapshot) {
      state = snapshot.snapshotData as T;
      fromVersion = snapshot.aggregateVersion;
    }

    // Get events after snapshot
    const events = await this.getAggregateEvents(
      aggregateType,
      aggregateId,
      fromVersion,
    );

    // Apply events to reconstruct state
    for (const event of events) {
      state = reducer(state, event);
    }

    const currentVersion = await this.getAggregateVersion(
      aggregateType,
      aggregateId,
    );

    return { state, version: currentVersion };
  }

  /**
   * Verify event store integrity
   */
  async verifyIntegrity(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    valid: boolean;
    totalEvents: number;
    validEvents: number;
    invalidEvents: Array<{ eventId: string; issue: string }>;
  }> {
    const events = await this.queryEvents({
      tenantId,
      startTime: startDate,
      endTime: endDate,
      limit: 10000,
    });

    let validEvents = 0;
    const invalidEvents: Array<{ eventId: string; issue: string }> = [];
    let expectedPreviousHash: string | undefined = undefined;

    for (const event of events.reverse()) {
      // Verify event hash
      const calculatedHash = this.calculateEventHash({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        aggregateVersion: event.aggregateVersion,
        eventData: event.eventData,
        userId: event.userId,
        eventTimestamp: event.eventTimestamp || new Date(),
      });

      if (event.eventHash !== calculatedHash) {
        invalidEvents.push({
          eventId: event.eventId,
          issue: 'Event hash mismatch - possible tampering',
        });
        continue;
      }

      // Verify chain integrity
      if (
        expectedPreviousHash !== undefined &&
        event.previousEventHash !== expectedPreviousHash
      ) {
        invalidEvents.push({
          eventId: event.eventId,
          issue: 'Chain integrity violation',
        });
      }

      expectedPreviousHash = event.eventHash;
      validEvents++;
    }

    const result = {
      valid: invalidEvents.length === 0,
      totalEvents: events.length,
      validEvents,
      invalidEvents,
    };

    serviceLogger.info(result, 'Event store integrity verification completed');

    return result;
  }

  /**
   * Helper: Create snapshot if needed (called automatically)
   */
  private async createSnapshotIfNeeded(
    aggregateType: string,
    aggregateId: string,
    version: number,
  ): Promise<void> {
    // This is a placeholder - actual implementation would depend on your domain models
    // You would reconstruct the aggregate state and save it as a snapshot
    serviceLogger.debug(
      { aggregateType, aggregateId, version },
      'Snapshot creation triggered',
    );
  }

  /**
   * Calculate event hash for integrity verification
   */
  private calculateEventHash(data: {
    eventId: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    aggregateVersion: number;
    eventData: Record<string, any>;
    userId: string;
    eventTimestamp: Date;
  }): string {
    const hashableData = {
      eventId: data.eventId,
      eventType: data.eventType,
      aggregateType: data.aggregateType,
      aggregateId: data.aggregateId,
      aggregateVersion: data.aggregateVersion,
      eventData: data.eventData,
      userId: data.userId,
      eventTimestamp: data.eventTimestamp.toISOString(),
    };

    return createHash('sha256')
      .update(JSON.stringify(hashableData, Object.keys(hashableData).sort()))
      .digest('hex');
  }

  /**
   * Calculate snapshot hash for integrity verification
   */
  private calculateSnapshotHash(data: {
    snapshotId: string;
    aggregateType: string;
    aggregateId: string;
    aggregateVersion: number;
    snapshotData: Record<string, any>;
  }): string {
    return createHash('sha256')
      .update(JSON.stringify(data, Object.keys(data).sort()))
      .digest('hex');
  }

  /**
   * Map database row to StoredEvent
   */
  private mapEventRow(row: any): StoredEvent {
    return {
      eventId: row.event_id,
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      aggregateVersion: row.aggregate_version,
      eventData: row.event_data,
      eventMetadata: row.event_metadata || {},
      tenantId: row.tenant_id,
      userId: row.user_id,
      correlationId: row.correlation_id || undefined,
      causationId: row.causation_id || undefined,
      legalBasis: row.legal_basis || undefined,
      dataClassification: row.data_classification || undefined,
      retentionPolicy: row.retention_policy || undefined,
      ipAddress: row.ip_address || undefined,
      userAgent: row.user_agent || undefined,
      sessionId: row.session_id || undefined,
      requestId: row.request_id || undefined,
      eventHash: row.event_hash,
      previousEventHash: row.previous_event_hash || undefined,
      eventTimestamp: row.event_timestamp,
      createdAt: row.created_at,
    };
  }
}
