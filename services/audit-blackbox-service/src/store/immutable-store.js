"use strict";
// @ts-nocheck
/**
 * Immutable Audit Store
 *
 * Append-only storage with cryptographic chaining (hash chain + Merkle tree)
 * for tamper-evident audit logging.
 *
 * Features:
 * - SHA-256 hash chain linking each event to previous
 * - HMAC-SHA256 signatures for integrity verification
 * - Merkle tree checkpoints for efficient batch verification
 * - PostgreSQL backend with JSONB for flexible queries
 * - Write-ahead logging for durability
 * - Efficient indexing for queries by actor, case, time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImmutableAuditStore = void 0;
const crypto_1 = require("crypto");
const events_1 = require("events");
const hash_utils_js_1 = require("../core/hash-utils.js");
/**
 * Immutable audit store with cryptographic integrity guarantees
 */
class ImmutableAuditStore extends events_1.EventEmitter {
    pool;
    config;
    lastChainEntry = null;
    currentSequence = 0n;
    initialized = false;
    // Genesis hash for the start of the chain
    static GENESIS_HASH = hash_utils_js_1.GENESIS_HASH;
    constructor(pool, config) {
        super();
        this.pool = pool;
        this.config = config;
    }
    /**
     * Initialize the store and database schema
     */
    async initialize() {
        if (this.initialized)
            return;
        await this.createSchema();
        await this.loadLastChainEntry();
        this.initialized = true;
        this.emit('initialized', {
            currentSequence: this.currentSequence,
            lastHash: this.lastChainEntry?.chainHash || ImmutableAuditStore.GENESIS_HASH,
        });
    }
    /**
     * Append a single audit event to the immutable store
     */
    async appendEvent(event) {
        if (!this.initialized) {
            throw new Error('Store not initialized. Call initialize() first.');
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Lock the chain table to prevent concurrent writes
            await client.query('LOCK TABLE audit_chain IN EXCLUSIVE MODE');
            const chainEntry = await this.appendEventInternal(client, event);
            await client.query('COMMIT');
            // Update local state
            this.lastChainEntry = chainEntry;
            this.currentSequence = chainEntry.sequence;
            // Check if we need to create a Merkle checkpoint
            if (Number(chainEntry.sequence) %
                this.config.merkleCheckpointInterval ===
                0) {
                // Create checkpoint asynchronously
                this.createMerkleCheckpoint(chainEntry.sequence).catch((err) => {
                    this.emit('error', {
                        type: 'checkpoint_error',
                        error: err.message,
                        sequence: chainEntry.sequence,
                    });
                });
            }
            this.emit('eventAppended', { eventId: event.id, chainEntry });
            return chainEntry;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Append multiple events in a single transaction
     */
    async appendEventsBatch(events) {
        if (!this.initialized) {
            throw new Error('Store not initialized. Call initialize() first.');
        }
        if (events.length === 0)
            return [];
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('LOCK TABLE audit_chain IN EXCLUSIVE MODE');
            const chainEntries = [];
            let workingSequence = this.currentSequence;
            let workingLastEntry = this.lastChainEntry;
            for (const event of events) {
                const chainEntry = await this.appendEventInternal(client, event, {
                    currentSequence: workingSequence,
                    lastChainEntry: workingLastEntry,
                });
                chainEntries.push(chainEntry);
                workingSequence = chainEntry.sequence;
                workingLastEntry = chainEntry;
            }
            await client.query('COMMIT');
            this.lastChainEntry = workingLastEntry;
            this.currentSequence = workingSequence;
            // Check for checkpoint
            const lastEntry = chainEntries[chainEntries.length - 1];
            if (Number(lastEntry.sequence) % this.config.merkleCheckpointInterval ===
                0) {
                this.createMerkleCheckpoint(lastEntry.sequence).catch((err) => {
                    this.emit('error', {
                        type: 'checkpoint_error',
                        error: err.message,
                        sequence: lastEntry.sequence,
                    });
                });
            }
            this.emit('batchAppended', {
                count: events.length,
                startSequence: chainEntries[0].sequence,
                endSequence: lastEntry.sequence,
            });
            return chainEntries;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Internal method to append a single event
     */
    async appendEventInternal(client, event, state) {
        // Ensure event has ID and timestamp
        if (!event.id) {
            event.id = (0, crypto_1.randomUUID)();
        }
        if (!event.timestamp) {
            event.timestamp = new Date();
        }
        if (!event.createdAt) {
            event.createdAt = new Date();
        }
        // Reject mutations by preventing overwrites of existing events
        const existing = await client.query('SELECT 1 FROM audit_events WHERE id = $1', [
            event.id,
        ]);
        if (existing.rowCount > 0) {
            throw new Error(`Append-only constraint violated: event ${event.id} already exists`);
        }
        const baseSequence = state?.currentSequence ?? this.currentSequence;
        const nextSequence = baseSequence + 1n;
        const previousHash = state?.lastChainEntry?.chainHash ||
            this.lastChainEntry?.chainHash ||
            ImmutableAuditStore.GENESIS_HASH;
        // Calculate event hash
        const eventHash = this.calculateEventHash(event);
        // Calculate chain hash
        const chainHash = this.calculateChainHash(eventHash, previousHash, nextSequence);
        // Create signature
        const signature = this.signChainEntry(eventHash, chainHash, nextSequence);
        // Create chain entry
        const chainEntry = {
            sequence: nextSequence,
            timestamp: event.timestamp,
            eventHash,
            previousHash,
            chainHash,
            signature,
            eventId: event.id,
        };
        // Update event with cryptographic data
        event.hash = eventHash;
        event.signature = signature;
        event.previousEventHash = previousHash;
        event.sequenceNumber = nextSequence;
        event.signatureAlgorithm = this.config.signatureAlgorithm;
        event.publicKeyId = this.config.publicKeyId;
        // Insert event into audit_events table
        await this.insertEvent(client, event);
        // Insert chain entry into audit_chain table
        await this.insertChainEntry(client, chainEntry);
        return chainEntry;
    }
    /**
     * Calculate SHA-256 hash of an audit event
     */
    calculateEventHash(event) {
        return (0, hash_utils_js_1.calculateEventHash)(event);
    }
    /**
     * Calculate chain hash: H(eventHash + previousHash + sequence)
     */
    calculateChainHash(eventHash, previousHash, sequence) {
        return (0, hash_utils_js_1.calculateChainHash)(eventHash, previousHash, sequence);
    }
    /**
     * Sign a chain entry using HMAC
     */
    signChainEntry(eventHash, chainHash, sequence) {
        const data = JSON.stringify({
            eventHash,
            chainHash,
            sequence: sequence.toString(),
        });
        return (0, crypto_1.createHmac)('sha256', this.config.signingKey)
            .update(data)
            .digest('hex');
    }
    /**
     * Verify a chain entry signature
     */
    verifySignature(entry) {
        if (!entry.signature)
            return false;
        const expectedSignature = this.signChainEntry(entry.eventHash, entry.chainHash, entry.sequence);
        return entry.signature === expectedSignature;
    }
    /**
     * Calculate Merkle root from a list of hashes
     */
    calculateMerkleRoot(hashes) {
        if (hashes.length === 0)
            return '';
        if (hashes.length === 1)
            return hashes[0];
        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left; // Duplicate if odd number
            const combined = (0, crypto_1.createHash)('sha256')
                .update(left + right)
                .digest('hex');
            nextLevel.push(combined);
        }
        return this.calculateMerkleRoot(nextLevel);
    }
    /**
     * Create a Merkle checkpoint for efficient verification
     */
    async createMerkleCheckpoint(endSequence) {
        const checkpointInterval = BigInt(this.config.merkleCheckpointInterval);
        const startSequence = endSequence - checkpointInterval + 1n;
        // Get chain hashes for the interval
        const result = await this.pool.query(`SELECT chain_hash FROM audit_chain
       WHERE sequence >= $1 AND sequence <= $2
       ORDER BY sequence ASC`, [startSequence.toString(), endSequence.toString()]);
        const hashes = result.rows.map((row) => row.chain_hash);
        const merkleRoot = this.calculateMerkleRoot(hashes);
        // Sign the checkpoint
        const checkpointData = JSON.stringify({
            startSequence: startSequence.toString(),
            endSequence: endSequence.toString(),
            eventCount: hashes.length,
            merkleRoot,
        });
        const signature = (0, crypto_1.createHmac)('sha256', this.config.signingKey)
            .update(checkpointData)
            .digest('hex');
        const checkpoint = {
            id: (0, crypto_1.randomUUID)(),
            startSequence,
            endSequence,
            timestamp: new Date(),
            eventCount: hashes.length,
            merkleRoot,
            signature,
            publicKeyId: this.config.publicKeyId || 'default',
        };
        // Store checkpoint
        await this.pool.query(`INSERT INTO audit_checkpoints
       (id, start_sequence, end_sequence, timestamp, event_count, merkle_root, signature, public_key_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            checkpoint.id,
            checkpoint.startSequence.toString(),
            checkpoint.endSequence.toString(),
            checkpoint.timestamp,
            checkpoint.eventCount,
            checkpoint.merkleRoot,
            checkpoint.signature,
            checkpoint.publicKeyId,
        ]);
        this.emit('checkpointCreated', checkpoint);
        return checkpoint;
    }
    /**
     * Verify integrity of the audit chain
     */
    async verifyIntegrity(startTime, endTime) {
        const issues = [];
        const brokenLinks = [];
        // Build query for time range
        let query = `
      SELECT c.*, e.* FROM audit_chain c
      JOIN audit_events e ON c.event_id = e.id
    `;
        const params = [];
        if (startTime || endTime) {
            const conditions = [];
            if (startTime) {
                conditions.push(`c.timestamp >= $${params.length + 1}`);
                params.push(startTime.toISOString());
            }
            if (endTime) {
                conditions.push(`c.timestamp <= $${params.length + 1}`);
                params.push(endTime.toISOString());
            }
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ' ORDER BY c.sequence ASC';
        const result = await this.pool.query(query, params);
        const rows = result.rows;
        if (rows.length === 0) {
            return {
                valid: true,
                verifiedAt: new Date(),
                timeRange: {
                    start: startTime || new Date(0),
                    end: endTime || new Date(),
                },
                summary: {
                    totalEvents: 0,
                    validEvents: 0,
                    invalidEvents: 0,
                    hashChainValid: true,
                    merkleRootValid: true,
                    signaturesValid: true,
                },
                issues: [],
                chainVerification: {
                    startHash: ImmutableAuditStore.GENESIS_HASH,
                    endHash: ImmutableAuditStore.GENESIS_HASH,
                    chainIntact: true,
                    brokenLinks: [],
                },
            };
        }
        let validEvents = 0;
        let invalidEvents = 0;
        let hashChainValid = true;
        let signaturesValid = true;
        // Get the expected previous hash for the first entry
        let expectedPreviousHash;
        const firstSequence = BigInt(rows[0].sequence);
        if (firstSequence === 1n) {
            expectedPreviousHash = ImmutableAuditStore.GENESIS_HASH;
        }
        else {
            // Get the previous chain entry
            const prevResult = await this.pool.query(`SELECT chain_hash FROM audit_chain WHERE sequence = $1`, [(firstSequence - 1n).toString()]);
            expectedPreviousHash = prevResult.rows[0]?.chain_hash || ImmutableAuditStore.GENESIS_HASH;
        }
        for (const row of rows) {
            const sequence = BigInt(row.sequence);
            const eventId = row.event_id;
            // Reconstruct event for hash verification
            const event = this.rowToEvent(row);
            // Verify event hash
            const calculatedEventHash = this.calculateEventHash(event);
            if (calculatedEventHash !== row.event_hash) {
                issues.push({
                    eventId,
                    sequenceNumber: sequence,
                    timestamp: new Date(row.timestamp),
                    issueType: 'hash_mismatch',
                    description: 'Event hash does not match calculated hash',
                    severity: 'critical',
                    expected: calculatedEventHash,
                    actual: row.event_hash,
                });
                invalidEvents++;
                continue;
            }
            // Verify previous hash linkage
            if (row.previous_hash !== expectedPreviousHash) {
                issues.push({
                    eventId,
                    sequenceNumber: sequence,
                    timestamp: new Date(row.timestamp),
                    issueType: 'chain_broken',
                    description: 'Previous hash does not match expected hash',
                    severity: 'critical',
                    expected: expectedPreviousHash,
                    actual: row.previous_hash,
                });
                brokenLinks.push({
                    eventId,
                    sequenceNumber: sequence,
                    expectedHash: expectedPreviousHash,
                    actualHash: row.previous_hash,
                });
                hashChainValid = false;
                invalidEvents++;
                continue;
            }
            // Verify chain hash
            const calculatedChainHash = this.calculateChainHash(row.event_hash, row.previous_hash, sequence);
            if (calculatedChainHash !== row.chain_hash) {
                issues.push({
                    eventId,
                    sequenceNumber: sequence,
                    timestamp: new Date(row.timestamp),
                    issueType: 'hash_mismatch',
                    description: 'Chain hash does not match calculated hash',
                    severity: 'critical',
                    expected: calculatedChainHash,
                    actual: row.chain_hash,
                });
                invalidEvents++;
                continue;
            }
            // Verify signature
            if (row.signature) {
                const chainEntry = {
                    sequence,
                    timestamp: new Date(row.timestamp),
                    eventHash: row.event_hash,
                    previousHash: row.previous_hash,
                    chainHash: row.chain_hash,
                    signature: row.signature,
                    eventId,
                };
                if (!this.verifySignature(chainEntry)) {
                    issues.push({
                        eventId,
                        sequenceNumber: sequence,
                        timestamp: new Date(row.timestamp),
                        issueType: 'signature_invalid',
                        description: 'Signature verification failed',
                        severity: 'high',
                    });
                    signaturesValid = false;
                    invalidEvents++;
                    continue;
                }
            }
            validEvents++;
            expectedPreviousHash = row.chain_hash;
        }
        const startHash = rows[0]?.previous_hash || ImmutableAuditStore.GENESIS_HASH;
        const endHash = rows[rows.length - 1]?.chain_hash || ImmutableAuditStore.GENESIS_HASH;
        return {
            valid: issues.length === 0,
            verifiedAt: new Date(),
            timeRange: {
                start: startTime || new Date(rows[0]?.timestamp || 0),
                end: endTime || new Date(rows[rows.length - 1]?.timestamp || 0),
            },
            summary: {
                totalEvents: rows.length,
                validEvents,
                invalidEvents,
                hashChainValid,
                merkleRootValid: true, // TODO: Verify against checkpoints
                signaturesValid,
            },
            issues,
            chainVerification: {
                startHash,
                endHash,
                chainIntact: hashChainValid,
                brokenLinks,
            },
        };
    }
    /**
     * Get events by query parameters
     */
    async queryEvents(query) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (query.startTime) {
            conditions.push(`timestamp >= $${paramIndex++}`);
            params.push(query.startTime);
        }
        if (query.endTime) {
            conditions.push(`timestamp <= $${paramIndex++}`);
            params.push(query.endTime);
        }
        if (query.tenantId) {
            conditions.push(`tenant_id = $${paramIndex++}`);
            params.push(query.tenantId);
        }
        if (query.userIds?.length) {
            conditions.push(`user_id = ANY($${paramIndex++})`);
            params.push(query.userIds);
        }
        if (query.eventTypes?.length) {
            conditions.push(`event_type = ANY($${paramIndex++})`);
            params.push(query.eventTypes);
        }
        if (query.correlationIds?.length) {
            conditions.push(`correlation_id = ANY($${paramIndex++})`);
            params.push(query.correlationIds);
        }
        if (query.resourceIds?.length) {
            conditions.push(`resource_id = ANY($${paramIndex++})`);
            params.push(query.resourceIds);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Get total count
        const countResult = await this.pool.query(`SELECT COUNT(*) FROM audit_events ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        // Get events with pagination
        const limit = query.limit || 100;
        const offset = query.offset || 0;
        const sortDirection = query.sortDirection && query.sortDirection.toLowerCase() === 'asc'
            ? 'ASC'
            : 'DESC';
        const eventsResult = await this.pool.query(`SELECT * FROM audit_events ${whereClause}
       ORDER BY timestamp ${sortDirection}, sequence_number ${sortDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, [...params, limit, offset]);
        const events = eventsResult.rows.map((row) => this.rowToEvent(row));
        return { events, total };
    }
    /**
     * Get current sequence number
     */
    getCurrentSequence() {
        return this.currentSequence;
    }
    /**
     * Get last chain hash
     */
    getLastChainHash() {
        return this.lastChainEntry?.chainHash || ImmutableAuditStore.GENESIS_HASH;
    }
    /**
     * Convert database row to AuditEvent
     */
    rowToEvent(row) {
        return {
            id: row.id,
            eventType: row.event_type,
            level: row.level,
            timestamp: new Date(row.timestamp),
            version: row.version || '1.0.0',
            correlationId: row.correlation_id,
            sessionId: row.session_id,
            requestId: row.request_id,
            parentEventId: row.parent_event_id,
            traceId: row.trace_id,
            spanId: row.span_id,
            userId: row.user_id,
            userName: row.user_name,
            userEmail: row.user_email,
            impersonatedBy: row.impersonated_by,
            serviceAccountId: row.service_account_id,
            tenantId: row.tenant_id,
            organizationId: row.organization_id,
            serviceId: row.service_id,
            serviceName: row.service_name,
            serviceVersion: row.service_version,
            environment: row.environment,
            hostId: row.host_id,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            resourceIds: row.resource_ids,
            resourcePath: row.resource_path,
            resourceName: row.resource_name,
            criticalCategory: row.critical_category,
            action: row.action,
            outcome: row.outcome,
            message: row.message,
            details: row.details || {},
            oldValues: row.old_values,
            newValues: row.new_values,
            diffSummary: row.diff_summary,
            ipAddress: row.ip_address,
            ipAddressV6: row.ip_address_v6,
            userAgent: row.user_agent,
            geolocation: row.geolocation,
            deviceFingerprint: row.device_fingerprint,
            complianceRelevant: row.compliance_relevant,
            complianceFrameworks: row.compliance_frameworks || [],
            dataClassification: row.data_classification,
            retentionPeriodDays: row.retention_period_days,
            legalHold: row.legal_hold,
            gdprLawfulBasis: row.gdpr_lawful_basis,
            hipaaRequirement: row.hipaa_requirement,
            hash: row.hash,
            signature: row.signature,
            previousEventHash: row.previous_event_hash,
            signatureAlgorithm: row.signature_algorithm,
            publicKeyId: row.public_key_id,
            duration: row.duration,
            errorCode: row.error_code,
            errorMessage: row.error_message,
            stackTrace: row.stack_trace,
            tags: row.tags,
            metadata: row.metadata,
            redacted: row.redacted,
            createdAt: row.created_at ? new Date(row.created_at) : undefined,
            sequenceNumber: row.sequence_number ? BigInt(row.sequence_number) : undefined,
            partition: row.partition,
        };
    }
    /**
     * Insert event into database
     */
    async insertEvent(client, event) {
        await client.query(`INSERT INTO audit_events (
        id, event_type, level, timestamp, version,
        correlation_id, session_id, request_id, parent_event_id, trace_id, span_id,
        user_id, user_name, user_email, impersonated_by, service_account_id,
        tenant_id, organization_id,
        service_id, service_name, service_version, environment, host_id,
        resource_type, resource_id, resource_ids, resource_path, resource_name,
        critical_category, action, outcome, message, details,
        old_values, new_values, diff_summary,
        ip_address, ip_address_v6, user_agent, geolocation, device_fingerprint,
        compliance_relevant, compliance_frameworks, data_classification,
        retention_period_days, legal_hold, gdpr_lawful_basis, hipaa_requirement,
        hash, signature, previous_event_hash, signature_algorithm, public_key_id,
        duration, error_code, error_message, stack_trace,
        tags, metadata, redacted,
        created_at, sequence_number
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18,
        $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33,
        $34, $35, $36,
        $37, $38, $39, $40, $41,
        $42, $43, $44,
        $45, $46, $47, $48,
        $49, $50, $51, $52, $53,
        $54, $55, $56, $57,
        $58, $59, $60,
        $61, $62
      )`, [
            event.id,
            event.eventType,
            event.level,
            event.timestamp,
            event.version || '1.0.0',
            event.correlationId,
            event.sessionId,
            event.requestId,
            event.parentEventId,
            event.traceId,
            event.spanId,
            event.userId,
            event.userName,
            event.userEmail,
            event.impersonatedBy,
            event.serviceAccountId,
            event.tenantId,
            event.organizationId,
            event.serviceId,
            event.serviceName,
            event.serviceVersion,
            event.environment,
            event.hostId,
            event.resourceType,
            event.resourceId,
            event.resourceIds,
            event.resourcePath,
            event.resourceName,
            event.criticalCategory,
            event.action,
            event.outcome,
            event.message,
            JSON.stringify(event.details),
            event.oldValues ? JSON.stringify(event.oldValues) : null,
            event.newValues ? JSON.stringify(event.newValues) : null,
            event.diffSummary,
            event.ipAddress,
            event.ipAddressV6,
            event.userAgent,
            event.geolocation ? JSON.stringify(event.geolocation) : null,
            event.deviceFingerprint,
            event.complianceRelevant,
            event.complianceFrameworks,
            event.dataClassification,
            event.retentionPeriodDays,
            event.legalHold,
            event.gdprLawfulBasis,
            event.hipaaRequirement,
            event.hash,
            event.signature,
            event.previousEventHash,
            event.signatureAlgorithm,
            event.publicKeyId,
            event.duration,
            event.errorCode,
            event.errorMessage,
            event.stackTrace,
            event.tags,
            event.metadata ? JSON.stringify(event.metadata) : null,
            event.redacted,
            event.createdAt,
            event.sequenceNumber?.toString(),
        ]);
    }
    /**
     * Insert chain entry into database
     */
    async insertChainEntry(client, entry) {
        await client.query(`INSERT INTO audit_chain (
        sequence, timestamp, event_hash, previous_hash, chain_hash, signature, event_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            entry.sequence.toString(),
            entry.timestamp,
            entry.eventHash,
            entry.previousHash,
            entry.chainHash,
            entry.signature,
            entry.eventId,
        ]);
    }
    /**
     * Load the last chain entry from database
     */
    async loadLastChainEntry() {
        const result = await this.pool.query(`SELECT * FROM audit_chain ORDER BY sequence DESC LIMIT 1`);
        if (result.rows.length > 0) {
            const row = result.rows[0];
            this.lastChainEntry = {
                sequence: BigInt(row.sequence),
                timestamp: new Date(row.timestamp),
                eventHash: row.event_hash,
                previousHash: row.previous_hash,
                chainHash: row.chain_hash,
                signature: row.signature,
                eventId: row.event_id,
            };
            this.currentSequence = this.lastChainEntry.sequence;
        }
    }
    /**
     * Create database schema
     */
    async createSchema() {
        await this.pool.query(`
      -- Main audit events table
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY,
        event_type TEXT NOT NULL,
        level TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version TEXT DEFAULT '1.0.0',

        -- Context & correlation
        correlation_id UUID NOT NULL,
        session_id UUID,
        request_id UUID,
        parent_event_id UUID,
        trace_id TEXT,
        span_id TEXT,

        -- Actors
        user_id TEXT,
        user_name TEXT,
        user_email TEXT,
        impersonated_by TEXT,
        service_account_id TEXT,
        tenant_id TEXT NOT NULL,
        organization_id TEXT,

        -- Service context
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        service_version TEXT,
        environment TEXT NOT NULL,
        host_id TEXT,

        -- Resource context
        resource_type TEXT,
        resource_id TEXT,
        resource_ids TEXT[],
        resource_path TEXT,
        resource_name TEXT,

        -- Action details
        critical_category TEXT,
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        message TEXT NOT NULL,
        details JSONB DEFAULT '{}',

        -- Mutation tracking
        old_values JSONB,
        new_values JSONB,
        diff_summary TEXT,

        -- Security context
        ip_address INET,
        ip_address_v6 INET,
        user_agent TEXT,
        geolocation JSONB,
        device_fingerprint TEXT,

        -- Compliance fields
        compliance_relevant BOOLEAN DEFAULT FALSE,
        compliance_frameworks TEXT[] DEFAULT '{}',
        data_classification TEXT,
        retention_period_days INTEGER,
        legal_hold BOOLEAN DEFAULT FALSE,
        gdpr_lawful_basis TEXT,
        hipaa_requirement TEXT,

        -- Cryptographic integrity
        hash TEXT,
        signature TEXT,
        previous_event_hash TEXT,
        signature_algorithm TEXT,
        public_key_id TEXT,

        -- Performance metrics
        duration INTEGER,
        error_code TEXT,
        error_message TEXT,
        stack_trace TEXT,

        -- Metadata
        tags TEXT[],
        metadata JSONB,
        redacted BOOLEAN DEFAULT FALSE,

        -- Audit metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sequence_number BIGINT
      );

      -- Hash chain table for tamper detection
      CREATE TABLE IF NOT EXISTS audit_chain (
        sequence BIGINT PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        event_hash TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        chain_hash TEXT NOT NULL,
        signature TEXT,
        event_id UUID NOT NULL REFERENCES audit_events(id)
      );

      -- Merkle checkpoints for efficient verification
      CREATE TABLE IF NOT EXISTS audit_checkpoints (
        id UUID PRIMARY KEY,
        start_sequence BIGINT NOT NULL,
        end_sequence BIGINT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        event_count INTEGER NOT NULL,
        merkle_root TEXT NOT NULL,
        signature TEXT NOT NULL,
        public_key_id TEXT NOT NULL
      );

      -- Redaction tombstones
      CREATE TABLE IF NOT EXISTS audit_redactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES audit_events(id),
        redaction_request_id UUID NOT NULL,
        redacted_fields TEXT[] NOT NULL,
        redacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        original_hash TEXT NOT NULL,
        reason TEXT NOT NULL,
        legal_basis TEXT NOT NULL
      );

      -- Indexes for efficient queries
      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id ON audit_events(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON audit_events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_events_level ON audit_events(level);
      CREATE INDEX IF NOT EXISTS idx_audit_events_service_id ON audit_events(service_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_resource_id ON audit_events(resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_resource_type ON audit_events(resource_type);
      CREATE INDEX IF NOT EXISTS idx_audit_events_compliance ON audit_events(compliance_relevant) WHERE compliance_relevant = true;
      CREATE INDEX IF NOT EXISTS idx_audit_events_legal_hold ON audit_events(legal_hold) WHERE legal_hold = true;
      CREATE INDEX IF NOT EXISTS idx_audit_events_sequence ON audit_events(sequence_number DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_critical ON audit_events(critical_category) WHERE critical_category IS NOT NULL;

      -- GIN index for JSONB details search
      CREATE INDEX IF NOT EXISTS idx_audit_events_details ON audit_events USING GIN(details);
      CREATE INDEX IF NOT EXISTS idx_audit_events_tags ON audit_events USING GIN(tags);

      -- Chain indexes
      CREATE INDEX IF NOT EXISTS idx_audit_chain_timestamp ON audit_chain(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_chain_event_id ON audit_chain(event_id);

      -- Checkpoint indexes
      CREATE INDEX IF NOT EXISTS idx_audit_checkpoints_sequence ON audit_checkpoints(end_sequence DESC);
    `);
    }
    /**
     * Close the store and release resources
     */
    async close() {
        // Pool will be closed by the caller
        this.initialized = false;
    }
}
exports.ImmutableAuditStore = ImmutableAuditStore;
