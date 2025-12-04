/**
 * Event Sourcing for Conversation State
 *
 * Implements event sourcing pattern for ChatOps conversations:
 * - Immutable event log
 * - State reconstruction from events
 * - Snapshots for performance
 * - Event replay for debugging
 * - Projections for different views
 *
 * Benefits:
 * - Complete audit trail
 * - Time-travel debugging
 * - State reconstruction at any point
 * - Decoupled projections
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export type EventType =
  | 'SessionCreated'
  | 'SessionUpdated'
  | 'SessionSuspended'
  | 'SessionResumed'
  | 'SessionExpired'
  | 'SessionTerminated'
  | 'TurnAdded'
  | 'TurnCompressed'
  | 'SummaryGenerated'
  | 'EntityExtracted'
  | 'FactExtracted'
  | 'ApprovalRequested'
  | 'ApprovalGranted'
  | 'ApprovalDenied'
  | 'ApprovalExpired'
  | 'TraceStarted'
  | 'TraceStepAdded'
  | 'TraceCompleted'
  | 'GuardrailTriggered'
  | 'HandoffInitiated'
  | 'HandoffCompleted';

export interface DomainEvent<T = unknown> {
  id: string;
  aggregateId: string;
  aggregateType: 'Session' | 'Approval' | 'Trace';
  type: EventType;
  version: number;
  data: T;
  metadata: EventMetadata;
  timestamp: Date;
  hash?: string;
}

export interface EventMetadata {
  userId: string;
  tenantId: string;
  correlationId?: string;
  causationId?: string;
  source: string;
  ip?: string;
}

export interface Snapshot<T> {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: T;
  timestamp: Date;
}

export interface EventStoreConfig {
  postgres: Pool;
  redis?: Redis;
  snapshotInterval?: number;
  enableCaching?: boolean;
  retentionDays?: number;
}

export interface EventQuery {
  aggregateId?: string;
  aggregateType?: string;
  eventTypes?: EventType[];
  startTime?: Date;
  endTime?: Date;
  afterVersion?: number;
  limit?: number;
  offset?: number;
}

// =============================================================================
// EVENT STORE
// =============================================================================

export class EventStore extends EventEmitter {
  private config: EventStoreConfig;
  private postgres: Pool;
  private redis?: Redis;
  private projections: Map<string, Projection> = new Map();

  constructor(config: EventStoreConfig) {
    super();
    this.config = {
      snapshotInterval: 100,
      enableCaching: true,
      retentionDays: 365,
      ...config,
    };
    this.postgres = config.postgres;
    this.redis = config.redis;
  }

  // ===========================================================================
  // EVENT APPEND
  // ===========================================================================

  /**
   * Append events to the store
   */
  async appendEvents(
    aggregateId: string,
    aggregateType: 'Session' | 'Approval' | 'Trace',
    events: Array<{
      type: EventType;
      data: unknown;
      metadata: EventMetadata;
    }>,
    expectedVersion?: number
  ): Promise<DomainEvent[]> {
    const client = await this.postgres.connect();

    try {
      await client.query('BEGIN');

      // Get current version
      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version), 0) as version
         FROM chatops_events
         WHERE aggregate_id = $1`,
        [aggregateId]
      );

      let currentVersion = parseInt(versionResult.rows[0].version, 10);

      // Optimistic concurrency check
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new ConcurrencyError(
          `Expected version ${expectedVersion}, but current version is ${currentVersion}`
        );
      }

      const savedEvents: DomainEvent[] = [];

      for (const event of events) {
        currentVersion++;

        const domainEvent: DomainEvent = {
          id: uuidv4(),
          aggregateId,
          aggregateType,
          type: event.type,
          version: currentVersion,
          data: event.data,
          metadata: event.metadata,
          timestamp: new Date(),
        };

        // Calculate event hash for integrity
        domainEvent.hash = this.calculateEventHash(domainEvent);

        // Insert event
        await client.query(
          `INSERT INTO chatops_events (
            id, aggregate_id, aggregate_type, type, version,
            data, metadata, timestamp, hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            domainEvent.id,
            domainEvent.aggregateId,
            domainEvent.aggregateType,
            domainEvent.type,
            domainEvent.version,
            JSON.stringify(domainEvent.data),
            JSON.stringify(domainEvent.metadata),
            domainEvent.timestamp,
            domainEvent.hash,
          ]
        );

        savedEvents.push(domainEvent);
      }

      await client.query('COMMIT');

      // Emit events for projections
      for (const event of savedEvents) {
        this.emit('event', event);
        this.emit(event.type, event);
      }

      // Check if snapshot needed
      if (currentVersion % this.config.snapshotInterval! === 0) {
        this.scheduleSnapshot(aggregateId, aggregateType, currentVersion);
      }

      // Invalidate cache
      if (this.redis) {
        await this.redis.del(`events:${aggregateId}`);
      }

      return savedEvents;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Append a single event
   */
  async appendEvent(
    aggregateId: string,
    aggregateType: 'Session' | 'Approval' | 'Trace',
    type: EventType,
    data: unknown,
    metadata: EventMetadata,
    expectedVersion?: number
  ): Promise<DomainEvent> {
    const events = await this.appendEvents(
      aggregateId,
      aggregateType,
      [{ type, data, metadata }],
      expectedVersion
    );
    return events[0];
  }

  // ===========================================================================
  // EVENT RETRIEVAL
  // ===========================================================================

  /**
   * Get all events for an aggregate
   */
  async getEvents(aggregateId: string, afterVersion = 0): Promise<DomainEvent[]> {
    // Check cache
    if (this.redis && afterVersion === 0) {
      const cached = await this.redis.get(`events:${aggregateId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.postgres.query(
      `SELECT * FROM chatops_events
       WHERE aggregate_id = $1 AND version > $2
       ORDER BY version ASC`,
      [aggregateId, afterVersion]
    );

    const events = result.rows.map(this.rowToEvent);

    // Cache if fetching from beginning
    if (this.redis && afterVersion === 0 && events.length > 0) {
      await this.redis.setex(
        `events:${aggregateId}`,
        3600,
        JSON.stringify(events)
      );
    }

    return events;
  }

  /**
   * Query events across aggregates
   */
  async queryEvents(query: EventQuery): Promise<DomainEvent[]> {
    let sql = 'SELECT * FROM chatops_events WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.aggregateId) {
      sql += ` AND aggregate_id = $${paramIndex++}`;
      params.push(query.aggregateId);
    }

    if (query.aggregateType) {
      sql += ` AND aggregate_type = $${paramIndex++}`;
      params.push(query.aggregateType);
    }

    if (query.eventTypes?.length) {
      sql += ` AND type = ANY($${paramIndex++})`;
      params.push(query.eventTypes);
    }

    if (query.startTime) {
      sql += ` AND timestamp >= $${paramIndex++}`;
      params.push(query.startTime);
    }

    if (query.endTime) {
      sql += ` AND timestamp <= $${paramIndex++}`;
      params.push(query.endTime);
    }

    if (query.afterVersion !== undefined) {
      sql += ` AND version > $${paramIndex++}`;
      params.push(query.afterVersion);
    }

    sql += ' ORDER BY timestamp ASC';

    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(query.offset);
    }

    const result = await this.postgres.query(sql, params);
    return result.rows.map(this.rowToEvent);
  }

  /**
   * Get events in a time range for replay
   */
  async getEventsForReplay(
    startTime: Date,
    endTime: Date,
    aggregateType?: string
  ): Promise<DomainEvent[]> {
    let sql = `SELECT * FROM chatops_events
               WHERE timestamp >= $1 AND timestamp <= $2`;
    const params: unknown[] = [startTime, endTime];

    if (aggregateType) {
      sql += ' AND aggregate_type = $3';
      params.push(aggregateType);
    }

    sql += ' ORDER BY timestamp ASC';

    const result = await this.postgres.query(sql, params);
    return result.rows.map(this.rowToEvent);
  }

  // ===========================================================================
  // SNAPSHOTS
  // ===========================================================================

  /**
   * Save a snapshot
   */
  async saveSnapshot<T>(snapshot: Snapshot<T>): Promise<void> {
    await this.postgres.query(
      `INSERT INTO chatops_snapshots (
        aggregate_id, aggregate_type, version, state, timestamp
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (aggregate_id)
      DO UPDATE SET version = $3, state = $4, timestamp = $5`,
      [
        snapshot.aggregateId,
        snapshot.aggregateType,
        snapshot.version,
        JSON.stringify(snapshot.state),
        snapshot.timestamp,
      ]
    );

    // Update cache
    if (this.redis) {
      await this.redis.setex(
        `snapshot:${snapshot.aggregateId}`,
        3600,
        JSON.stringify(snapshot)
      );
    }
  }

  /**
   * Get latest snapshot for an aggregate
   */
  async getSnapshot<T>(aggregateId: string): Promise<Snapshot<T> | null> {
    // Check cache
    if (this.redis) {
      const cached = await this.redis.get(`snapshot:${aggregateId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.postgres.query(
      `SELECT * FROM chatops_snapshots WHERE aggregate_id = $1`,
      [aggregateId]
    );

    if (!result.rows[0]) return null;

    const snapshot: Snapshot<T> = {
      aggregateId: result.rows[0].aggregate_id,
      aggregateType: result.rows[0].aggregate_type,
      version: result.rows[0].version,
      state: result.rows[0].state,
      timestamp: new Date(result.rows[0].timestamp),
    };

    // Cache
    if (this.redis) {
      await this.redis.setex(
        `snapshot:${aggregateId}`,
        3600,
        JSON.stringify(snapshot)
      );
    }

    return snapshot;
  }

  private scheduleSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number
  ): void {
    // Schedule async snapshot creation
    setImmediate(async () => {
      try {
        const aggregate = await this.loadAggregate(aggregateId, aggregateType);
        if (aggregate) {
          await this.saveSnapshot({
            aggregateId,
            aggregateType,
            version,
            state: aggregate,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error(`Error creating snapshot for ${aggregateId}:`, error);
      }
    });
  }

  // ===========================================================================
  // AGGREGATE LOADING
  // ===========================================================================

  /**
   * Load aggregate state by replaying events
   */
  async loadAggregate<T>(
    aggregateId: string,
    aggregateType: string,
    asOfVersion?: number
  ): Promise<T | null> {
    // Get snapshot
    const snapshot = await this.getSnapshot<T>(aggregateId);
    const afterVersion = snapshot?.version || 0;

    // Get events after snapshot
    let events = await this.getEvents(aggregateId, afterVersion);

    // Filter to specific version if requested
    if (asOfVersion !== undefined) {
      events = events.filter(e => e.version <= asOfVersion);
    }

    if (!snapshot && events.length === 0) {
      return null;
    }

    // Get aggregate reducer
    const reducer = this.getReducer(aggregateType);
    if (!reducer) {
      throw new Error(`No reducer registered for ${aggregateType}`);
    }

    // Replay events
    let state = snapshot?.state || reducer.getInitialState();
    for (const event of events) {
      state = reducer.apply(state, event);
    }

    return state as T;
  }

  // ===========================================================================
  // PROJECTIONS
  // ===========================================================================

  /**
   * Register a projection
   */
  registerProjection(projection: Projection): void {
    this.projections.set(projection.name, projection);

    // Subscribe to relevant events
    for (const eventType of projection.eventTypes) {
      this.on(eventType, (event: DomainEvent) => {
        projection.apply(event).catch(err => {
          console.error(`Projection ${projection.name} failed:`, err);
        });
      });
    }
  }

  /**
   * Rebuild a projection from scratch
   */
  async rebuildProjection(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection ${projectionName} not found`);
    }

    // Reset projection state
    await projection.reset();

    // Replay all relevant events
    const events = await this.queryEvents({
      eventTypes: projection.eventTypes,
    });

    for (const event of events) {
      await projection.apply(event);
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private calculateEventHash(event: DomainEvent): string {
    const content = JSON.stringify({
      id: event.id,
      aggregateId: event.aggregateId,
      type: event.type,
      version: event.version,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private rowToEvent(row: Record<string, unknown>): DomainEvent {
    return {
      id: row.id as string,
      aggregateId: row.aggregate_id as string,
      aggregateType: row.aggregate_type as 'Session' | 'Approval' | 'Trace',
      type: row.type as EventType,
      version: row.version as number,
      data: row.data,
      metadata: row.metadata as EventMetadata,
      timestamp: new Date(row.timestamp as string),
      hash: row.hash as string,
    };
  }

  private reducers: Map<string, AggregateReducer> = new Map();

  registerReducer(aggregateType: string, reducer: AggregateReducer): void {
    this.reducers.set(aggregateType, reducer);
  }

  private getReducer(aggregateType: string): AggregateReducer | undefined {
    return this.reducers.get(aggregateType);
  }
}

// =============================================================================
// AGGREGATE REDUCERS
// =============================================================================

export interface AggregateReducer<T = unknown> {
  getInitialState(): T;
  apply(state: T, event: DomainEvent): T;
}

/**
 * Session aggregate reducer
 */
export const SessionReducer: AggregateReducer = {
  getInitialState() {
    return {
      id: '',
      status: 'active',
      turns: [],
      metadata: {},
      entities: [],
      createdAt: null,
      updatedAt: null,
    };
  },

  apply(state: any, event: DomainEvent) {
    switch (event.type) {
      case 'SessionCreated':
        return {
          ...state,
          ...event.data,
          id: event.aggregateId,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        };

      case 'SessionUpdated':
        return {
          ...state,
          ...event.data,
          updatedAt: event.timestamp,
        };

      case 'SessionSuspended':
        return {
          ...state,
          status: 'suspended',
          updatedAt: event.timestamp,
        };

      case 'SessionResumed':
        return {
          ...state,
          status: 'active',
          updatedAt: event.timestamp,
        };

      case 'SessionExpired':
        return {
          ...state,
          status: 'expired',
          updatedAt: event.timestamp,
        };

      case 'SessionTerminated':
        return {
          ...state,
          status: 'terminated',
          updatedAt: event.timestamp,
        };

      case 'TurnAdded':
        return {
          ...state,
          turns: [...state.turns, event.data],
          updatedAt: event.timestamp,
        };

      case 'TurnCompressed':
        const { removedTurnIds, summary } = event.data as {
          removedTurnIds: string[];
          summary: any;
        };
        return {
          ...state,
          turns: [
            ...state.turns.filter((t: any) => !removedTurnIds.includes(t.id)),
            summary,
          ],
          updatedAt: event.timestamp,
        };

      case 'EntityExtracted':
        return {
          ...state,
          entities: [...state.entities, ...(event.data as any).entities],
          updatedAt: event.timestamp,
        };

      default:
        return state;
    }
  },
};

// =============================================================================
// PROJECTIONS
// =============================================================================

export interface Projection {
  name: string;
  eventTypes: EventType[];
  apply(event: DomainEvent): Promise<void>;
  reset(): Promise<void>;
}

/**
 * Session statistics projection
 */
export class SessionStatsProjection implements Projection {
  name = 'session-stats';
  eventTypes: EventType[] = [
    'SessionCreated',
    'SessionExpired',
    'SessionTerminated',
    'TurnAdded',
  ];

  private postgres: Pool;

  constructor(postgres: Pool) {
    this.postgres = postgres;
  }

  async apply(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'SessionCreated':
        await this.postgres.query(
          `INSERT INTO chatops_session_stats (tenant_id, date, sessions_created)
           VALUES ($1, $2, 1)
           ON CONFLICT (tenant_id, date)
           DO UPDATE SET sessions_created = chatops_session_stats.sessions_created + 1`,
          [event.metadata.tenantId, event.timestamp.toISOString().split('T')[0]]
        );
        break;

      case 'TurnAdded':
        await this.postgres.query(
          `INSERT INTO chatops_session_stats (tenant_id, date, total_turns)
           VALUES ($1, $2, 1)
           ON CONFLICT (tenant_id, date)
           DO UPDATE SET total_turns = chatops_session_stats.total_turns + 1`,
          [event.metadata.tenantId, event.timestamp.toISOString().split('T')[0]]
        );
        break;
    }
  }

  async reset(): Promise<void> {
    await this.postgres.query('TRUNCATE chatops_session_stats');
  }
}

/**
 * Entity mention projection for analytics
 */
export class EntityMentionProjection implements Projection {
  name = 'entity-mentions';
  eventTypes: EventType[] = ['EntityExtracted'];

  private postgres: Pool;

  constructor(postgres: Pool) {
    this.postgres = postgres;
  }

  async apply(event: DomainEvent): Promise<void> {
    const { entities } = event.data as { entities: any[] };

    for (const entity of entities) {
      await this.postgres.query(
        `INSERT INTO chatops_entity_mentions (
          entity_type, entity_value, tenant_id, mention_count, last_mentioned
        ) VALUES ($1, $2, $3, 1, $4)
        ON CONFLICT (entity_type, entity_value, tenant_id)
        DO UPDATE SET
          mention_count = chatops_entity_mentions.mention_count + 1,
          last_mentioned = $4`,
        [entity.type, entity.value, event.metadata.tenantId, event.timestamp]
      );
    }
  }

  async reset(): Promise<void> {
    await this.postgres.query('TRUNCATE chatops_entity_mentions');
  }
}

// =============================================================================
// ERRORS
// =============================================================================

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createEventStore(config: EventStoreConfig): EventStore {
  const store = new EventStore(config);

  // Register default reducers
  store.registerReducer('Session', SessionReducer);

  return store;
}
