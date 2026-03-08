"use strict";
/**
 * Event Sourcing Service - Central event store for complete state reconstruction
 * Implements append-only event logging with tamper-proof integrity
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSourcingService = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const serviceLogger = logger_js_1.default.child({ name: 'EventSourcingService' });
// ============================================================================
// EVENT SOURCING SERVICE
// ============================================================================
class EventSourcingService {
    pg;
    lastEventHash = '';
    usePartitions;
    primaryEventTable;
    legacyEventTable = 'event_store';
    monthsAhead;
    retentionMonths;
    constructor(pg) {
        this.pg = pg;
        this.usePartitions = process.env.DB_PARTITIONS_V1 === '1';
        this.monthsAhead =
            Number(process.env.DB_PARTITION_MONTHS_AHEAD || 2) || 2;
        this.retentionMonths =
            Number(process.env.DB_PARTITION_RETENTION_MONTHS || 18) || 18;
        this.primaryEventTable = this.usePartitions
            ? 'event_store_partitioned'
            : 'event_store';
        this.initializeLastEventHash();
    }
    /**
     * Initialize the last event hash from the database
     */
    async initializeLastEventHash() {
        try {
            const { rows } = await this.pg.query(this.buildEventSourceQuery('', 'ORDER BY event_timestamp DESC, created_at DESC', 'LIMIT 1'));
            if (rows[0]?.event_hash) {
                this.lastEventHash = rows[0].event_hash;
            }
        }
        catch (error) {
            serviceLogger.warn({ error: error.message }, 'Failed to initialize last event hash');
        }
    }
    /**
     * Append a new event to the event store
     */
    async appendEvent(event, client, options) {
        const eventId = event.eventId || (0, crypto_1.randomUUID)();
        // Get current version for this aggregate
        const currentVersion = await this.getAggregateVersion(event.aggregateType, event.aggregateId, client);
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
        const managedClient = client || (this.usePartitions ? await this.pg.connect() : null);
        const manageTx = this.usePartitions && !options?.skipTransaction;
        const values = [
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
        ];
        try {
            if (manageTx) {
                await managedClient.query('BEGIN');
            }
            if (this.usePartitions) {
                await managedClient.query('SELECT ensure_event_store_partition($1, $2, $3)', [event.tenantId, this.monthsAhead, this.retentionMonths]);
            }
            const { rows } = await (managedClient || this.pg).query(`INSERT INTO ${this.primaryEventTable} (
          event_id, event_type, aggregate_type, aggregate_id, aggregate_version,
          event_data, event_metadata, tenant_id, user_id, correlation_id, causation_id,
          legal_basis, data_classification, retention_policy,
          ip_address, user_agent, session_id, request_id,
          event_hash, previous_event_hash, event_timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`, values);
            if (this.usePartitions) {
                await managedClient.query(`INSERT INTO ${this.legacyEventTable} (
            event_id, event_type, aggregate_type, aggregate_id, aggregate_version,
            event_data, event_metadata, tenant_id, user_id, correlation_id, causation_id,
            legal_basis, data_classification, retention_policy,
            ip_address, user_agent, session_id, request_id,
            event_hash, previous_event_hash, event_timestamp
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          ON CONFLICT (event_id) DO NOTHING`, values);
            }
            if (manageTx) {
                await managedClient.query('COMMIT');
            }
            const storedEvent = this.mapEventRow(rows[0]);
            serviceLogger.info({
                eventId,
                eventType: event.eventType,
                aggregateType: event.aggregateType,
                aggregateId: event.aggregateId,
                aggregateVersion: newVersion,
                partitioned: this.usePartitions,
            }, 'Event appended to event store');
            if (newVersion % 100 === 0) {
                await this.createSnapshotIfNeeded(event.aggregateType, event.aggregateId, newVersion);
            }
            return storedEvent;
        }
        catch (error) {
            if (manageTx) {
                await managedClient.query('ROLLBACK');
            }
            serviceLogger.error({
                error: error.message,
                event,
            }, 'Failed to append event');
            throw error;
        }
        finally {
            if (!client && managedClient) {
                managedClient.release();
            }
        }
    }
    /**
     * Append multiple events in a transaction (atomic batch)
     */
    async appendEvents(events) {
        const client = this.usePartitions ? await this.pg.connect() : null;
        const storedEvents = [];
        try {
            if (client) {
                await client.query('BEGIN');
            }
            for (const event of events) {
                const storedEvent = await this.appendEvent(event, client || undefined, {
                    skipTransaction: true,
                });
                storedEvents.push(storedEvent);
            }
            if (client) {
                await client.query('COMMIT');
            }
            serviceLogger.info({ eventCount: events.length }, 'Batch events appended successfully');
            return storedEvents;
        }
        catch (error) {
            if (client) {
                await client.query('ROLLBACK');
            }
            serviceLogger.error({ error: error.message }, 'Failed to append batch events');
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Get all events for an aggregate (for state reconstruction)
     */
    async getAggregateEvents(aggregateType, aggregateId, fromVersion = 0) {
        const sql = this.buildEventSourceQuery('aggregate_type = $1 AND aggregate_id = $2 AND aggregate_version > $3', 'ORDER BY aggregate_version ASC');
        const { rows } = await this.pg.query(sql, [
            aggregateType,
            aggregateId,
            fromVersion,
        ]);
        return rows.map(this.mapEventRow);
    }
    /**
     * Get current version of an aggregate
     */
    async getAggregateVersion(aggregateType, aggregateId, client) {
        if (!this.usePartitions) {
            const { rows } = await this.pg.query(`SELECT COALESCE(MAX(aggregate_version), 0) as version
         FROM ${this.legacyEventTable}
         WHERE aggregate_type = $1 AND aggregate_id = $2`, [aggregateType, aggregateId]);
            return parseInt(rows[0]?.version || '0', 10);
        }
        const target = client || this.pg;
        const { rows } = await target.query(`
        SELECT GREATEST(
          COALESCE((SELECT MAX(aggregate_version) FROM ${this.primaryEventTable} WHERE aggregate_type = $1 AND aggregate_id = $2), 0),
          COALESCE((SELECT MAX(aggregate_version) FROM ${this.legacyEventTable} WHERE aggregate_type = $1 AND aggregate_id = $2), 0)
        ) AS version
      `, [aggregateType, aggregateId]);
        return parseInt(rows[0]?.version || '0', 10);
    }
    /**
     * Query events with filters
     */
    async queryEvents(query) {
        const params = [query.tenantId];
        let filter = `tenant_id = $1`;
        let paramIndex = 2;
        if (query.aggregateType) {
            filter += ` AND aggregate_type = $${paramIndex}`;
            params.push(query.aggregateType);
            paramIndex++;
        }
        if (query.aggregateId) {
            filter += ` AND aggregate_id = $${paramIndex}`;
            params.push(query.aggregateId);
            paramIndex++;
        }
        if (query.eventType) {
            filter += ` AND event_type = $${paramIndex}`;
            params.push(query.eventType);
            paramIndex++;
        }
        if (query.userId) {
            filter += ` AND user_id = $${paramIndex}`;
            params.push(query.userId);
            paramIndex++;
        }
        if (query.startTime) {
            filter += ` AND event_timestamp >= $${paramIndex}`;
            params.push(query.startTime);
            paramIndex++;
        }
        if (query.endTime) {
            filter += ` AND event_timestamp <= $${paramIndex}`;
            params.push(query.endTime);
            paramIndex++;
        }
        if (query.correlationId) {
            filter += ` AND correlation_id = $${paramIndex}`;
            params.push(query.correlationId);
            paramIndex++;
        }
        const orderClause = `ORDER BY event_timestamp DESC, aggregate_version DESC`;
        const limitClause = [];
        if (query.limit) {
            limitClause.push(`LIMIT $${paramIndex}`);
            params.push(Math.min(query.limit, 10000));
            paramIndex++;
        }
        if (query.offset) {
            limitClause.push(`OFFSET $${paramIndex}`);
            params.push(query.offset);
            paramIndex++;
        }
        const sql = this.buildEventSourceQuery(filter, orderClause, limitClause.join(' '));
        const { rows } = await this.pg.query(sql, params);
        return rows.map(this.mapEventRow);
    }
    /**
     * Create a snapshot of aggregate state
     */
    async createSnapshot(snapshot) {
        const snapshotId = snapshot.snapshotId || (0, crypto_1.randomUUID)();
        // Get event count for this aggregate up to this version
        const { rows: countRows } = await this.pg.query(this.buildEventSourceQuery('aggregate_type = $1 AND aggregate_id = $2 AND aggregate_version <= $3'), [snapshot.aggregateType, snapshot.aggregateId, snapshot.aggregateVersion]);
        const eventCount = parseInt(countRows[0]?.count || '0', 10);
        const snapshotHash = this.calculateSnapshotHash({
            snapshotId,
            aggregateType: snapshot.aggregateType,
            aggregateId: snapshot.aggregateId,
            aggregateVersion: snapshot.aggregateVersion,
            snapshotData: snapshot.snapshotData,
        });
        await this.pg.query(`INSERT INTO event_snapshots (
        snapshot_id, aggregate_type, aggregate_id, aggregate_version,
        snapshot_data, snapshot_metadata, snapshot_hash, event_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (aggregate_type, aggregate_id, aggregate_version) DO UPDATE
      SET snapshot_data = EXCLUDED.snapshot_data,
          snapshot_metadata = EXCLUDED.snapshot_metadata,
          snapshot_hash = EXCLUDED.snapshot_hash,
          event_count = EXCLUDED.event_count`, [
            snapshotId,
            snapshot.aggregateType,
            snapshot.aggregateId,
            snapshot.aggregateVersion,
            JSON.stringify(snapshot.snapshotData),
            JSON.stringify(snapshot.snapshotMetadata || {}),
            snapshotHash,
            eventCount,
        ]);
        serviceLogger.info({
            aggregateType: snapshot.aggregateType,
            aggregateId: snapshot.aggregateId,
            aggregateVersion: snapshot.aggregateVersion,
        }, 'Snapshot created');
    }
    /**
     * Get the latest snapshot for an aggregate
     */
    async getLatestSnapshot(aggregateType, aggregateId) {
        const { rows } = await this.pg.query(`SELECT * FROM event_snapshots
       WHERE aggregate_type = $1 AND aggregate_id = $2
       ORDER BY aggregate_version DESC
       LIMIT 1`, [aggregateType, aggregateId]);
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
    async reconstructAggregate(aggregateType, aggregateId, reducer, initialState) {
        // Try to get latest snapshot first
        const snapshot = await this.getLatestSnapshot(aggregateType, aggregateId);
        let state = initialState;
        let fromVersion = 0;
        if (snapshot) {
            state = snapshot.snapshotData;
            fromVersion = snapshot.aggregateVersion;
        }
        // Get events after snapshot
        const events = await this.getAggregateEvents(aggregateType, aggregateId, fromVersion);
        // Apply events to reconstruct state
        for (const event of events) {
            state = reducer(state, event);
        }
        const currentVersion = await this.getAggregateVersion(aggregateType, aggregateId);
        return { state, version: currentVersion };
    }
    /**
     * Verify event store integrity
     */
    async verifyIntegrity(tenantId, startDate, endDate) {
        const events = await this.queryEvents({
            tenantId,
            startTime: startDate,
            endTime: endDate,
            limit: 10000,
        });
        let validEvents = 0;
        const invalidEvents = [];
        let expectedPreviousHash = undefined;
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
            if (expectedPreviousHash !== undefined &&
                event.previousEventHash !== expectedPreviousHash) {
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
     * Build an event store query that prefers partitions but falls back to the legacy table.
     */
    buildEventSourceQuery(whereClause, orderClause, trailingClause) {
        const where = whereClause ? `WHERE ${whereClause}` : '';
        if (!this.usePartitions) {
            return [
                `SELECT * FROM ${this.legacyEventTable} ${where}`,
                orderClause ?? '',
                trailingClause ?? '',
            ]
                .join(' ')
                .trim();
        }
        const legacyWhere = whereClause
            ? `WHERE ${whereClause} AND NOT EXISTS (
          SELECT 1 FROM ${this.primaryEventTable} p WHERE p.event_id = ${this.legacyEventTable}.event_id
        )`
            : `WHERE NOT EXISTS (
          SELECT 1 FROM ${this.primaryEventTable} p WHERE p.event_id = ${this.legacyEventTable}.event_id
        )`;
        return `
      WITH combined AS (
        SELECT * FROM ${this.primaryEventTable} ${where}
        UNION ALL
        SELECT * FROM ${this.legacyEventTable} ${legacyWhere}
      )
      SELECT * FROM combined ${orderClause ?? ''} ${trailingClause ?? ''};
    `.trim();
    }
    /**
     * Helper: Create snapshot if needed (called automatically)
     */
    async createSnapshotIfNeeded(aggregateType, aggregateId, version) {
        // This is a placeholder - actual implementation would depend on your domain models
        // You would reconstruct the aggregate state and save it as a snapshot
        serviceLogger.debug({ aggregateType, aggregateId, version }, 'Snapshot creation triggered');
    }
    /**
     * Calculate event hash for integrity verification
     */
    calculateEventHash(data) {
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
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(hashableData, Object.keys(hashableData).sort()))
            .digest('hex');
    }
    /**
     * Calculate snapshot hash for integrity verification
     */
    calculateSnapshotHash(data) {
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(data, Object.keys(data).sort()))
            .digest('hex');
    }
    /**
     * Map database row to StoredEvent
     */
    mapEventRow(row) {
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
exports.EventSourcingService = EventSourcingService;
