"use strict";
/**
 * @fileoverview Case Audit Log - Immutable Hash-Chained Audit Trail
 *
 * Implements an append-only, tamper-evident audit log for case operations.
 * Each record is linked to the previous via SHA-256 hashing, creating a
 * blockchain-like structure that allows independent verification.
 *
 * Security Features:
 * - SHA-256 hash of record content + previous hash (chain integrity)
 * - Deterministic JSON serialization for reproducible hashes
 * - Append-only operations (no updates or deletes)
 * - Chain verification for tamper detection
 *
 * Compliance Features:
 * - Required reason-for-access on view operations
 * - Legal basis tracking
 * - Authority/warrant linkage
 * - Full session context (IP, user agent, correlation ID)
 *
 * @module cases/domain/CaseAuditLog
 * @note This module is essential for the "Case spaces with immutable audit" feature.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseAuditLogRepository = void 0;
exports.createCaseAuditLogRepository = createCaseAuditLogRepository;
const crypto_1 = require("crypto");
/**
 * Case Audit Log Repository Implementation
 *
 * Provides append-only audit logging with hash-chain integrity
 */
class CaseAuditLogRepository {
    pool;
    tableName = 'maestro.case_audit_logs';
    /**
     * In-memory cache of last hash per case for performance
     * In production, this should be backed by Redis for multi-instance consistency
     */
    lastHashCache = new Map();
    constructor(pool) {
        this.pool = pool;
        // Initialize cache on startup
        this.initializeHashCache().catch(err => {
            console.error('[CaseAuditLog] Failed to initialize hash cache:', err.message);
        });
    }
    /**
     * Initialize the hash cache from database
     */
    async initializeHashCache() {
        try {
            const result = await this.pool.query(`
        SELECT DISTINCT ON (case_id) case_id, hash
        FROM ${this.tableName}
        ORDER BY case_id, timestamp DESC
      `);
            for (const row of result.rows) {
                this.lastHashCache.set(row.case_id, row.hash);
            }
        }
        catch (error) {
            // Table might not exist yet - that's okay
            if (error.code !== '42P01') {
                throw error;
            }
        }
    }
    /**
     * Append a new audit record to the log
     *
     * @param input - Audit record input (without computed fields)
     * @returns The created audit record with hash and ID
     */
    async append(input) {
        const auditId = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        // Get previous hash for this case
        const prevHash = await this.getLastHash(input.caseId);
        // Compute hash of this record
        const hash = this.computeHash({
            auditId,
            caseId: input.caseId,
            tenantId: input.tenantId,
            timestamp,
            actorId: input.actorId,
            action: input.action,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            details: input.details,
            reasonForAccess: input.reasonForAccess,
            legalBasis: input.legalBasis,
            authorityId: input.authorityId,
            prevHash,
        });
        // Insert into database
        const result = await this.pool.query(`
      INSERT INTO ${this.tableName} (
        audit_id, case_id, tenant_id, timestamp, actor_id, action,
        resource_type, resource_id, details, reason_for_access,
        legal_basis, authority_id, policy_decision, session_context,
        prev_hash, hash
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
      `, [
            auditId,
            input.caseId,
            input.tenantId,
            timestamp,
            input.actorId,
            input.action,
            input.resourceType || null,
            input.resourceId || null,
            input.details ? JSON.stringify(input.details) : null,
            input.reasonForAccess || null,
            input.legalBasis || null,
            input.authorityId || null,
            input.policyDecision ? JSON.stringify(input.policyDecision) : null,
            input.sessionContext ? JSON.stringify(input.sessionContext) : null,
            prevHash || null,
            hash,
        ]);
        // Update cache
        this.lastHashCache.set(input.caseId, hash);
        return this.mapRow(result.rows[0]);
    }
    /**
     * List audit records for a specific case
     *
     * @param caseId - Case identifier
     * @param limit - Maximum records to return (default 100)
     * @param offset - Offset for pagination (default 0)
     * @returns List of audit records ordered by timestamp DESC
     */
    async listByCase(caseId, limit = 100, offset = 0) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
      `, [caseId, Math.min(limit, 10000), offset]);
        return result.rows.map(this.mapRow);
    }
    /**
     * List audit records by actor (user)
     *
     * @param actorId - User identifier
     * @param tenantId - Tenant identifier (for isolation)
     * @param limit - Maximum records to return
     * @param offset - Offset for pagination
     * @returns List of audit records for this actor
     */
    async listByActor(actorId, tenantId, limit = 100, offset = 0) {
        const result = await this.pool.query(`
      SELECT * FROM ${this.tableName}
      WHERE actor_id = $1 AND tenant_id = $2
      ORDER BY timestamp DESC
      LIMIT $3 OFFSET $4
      `, [actorId, tenantId, Math.min(limit, 10000), offset]);
        return result.rows.map(this.mapRow);
    }
    /**
     * Get the hash of the last audit record for a case
     *
     * @param caseId - Case identifier
     * @returns Hash of the last record, or undefined if no records exist
     */
    async getLastHash(caseId) {
        // Check cache first
        const cached = this.lastHashCache.get(caseId);
        if (cached) {
            return cached;
        }
        // Query database
        const result = await this.pool.query(`
      SELECT hash FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
      `, [caseId]);
        if (result.rows.length === 0) {
            return undefined;
        }
        const hash = result.rows[0].hash;
        this.lastHashCache.set(caseId, hash);
        return hash;
    }
    /**
     * Verify the integrity of the audit chain for a case
     *
     * This method independently recomputes all hashes and verifies
     * the chain linkage is intact. Use for compliance audits.
     *
     * @param caseId - Case identifier
     * @returns Verification result with detailed findings
     */
    async verifyChain(caseId) {
        // Get all records in chronological order
        const result = await this.pool.query(`
      SELECT * FROM ${this.tableName}
      WHERE case_id = $1
      ORDER BY timestamp ASC
      `, [caseId]);
        const records = result.rows.map(this.mapRow);
        if (records.length === 0) {
            return {
                ok: true,
                totalRecords: 0,
                validRecords: 0,
                invalidRecords: 0,
            };
        }
        const issues = [];
        let validRecords = 0;
        let expectedPrevHash = undefined;
        for (const record of records) {
            // Check chain linkage
            if (expectedPrevHash !== undefined) {
                if (record.prevHash !== expectedPrevHash) {
                    issues.push({
                        auditId: record.auditId,
                        issue: 'CHAIN_BROKEN',
                        expected: expectedPrevHash,
                        actual: record.prevHash || 'null',
                    });
                }
            }
            else {
                // First record should have no prevHash
                if (record.prevHash) {
                    issues.push({
                        auditId: record.auditId,
                        issue: 'CHAIN_BROKEN',
                        expected: 'null',
                        actual: record.prevHash,
                    });
                }
            }
            // Recompute hash
            const computedHash = this.computeHash({
                auditId: record.auditId,
                caseId: record.caseId,
                tenantId: record.tenantId,
                timestamp: record.timestamp,
                actorId: record.actorId,
                action: record.action,
                resourceType: record.resourceType,
                resourceId: record.resourceId,
                details: record.details,
                reasonForAccess: record.reasonForAccess,
                legalBasis: record.legalBasis,
                authorityId: record.authorityId,
                prevHash: record.prevHash,
            });
            if (computedHash !== record.hash) {
                issues.push({
                    auditId: record.auditId,
                    issue: 'HASH_MISMATCH',
                    expected: computedHash,
                    actual: record.hash,
                });
            }
            else {
                validRecords++;
            }
            // Update expected prev hash for next iteration
            expectedPrevHash = record.hash;
        }
        return {
            ok: issues.length === 0,
            totalRecords: records.length,
            validRecords,
            invalidRecords: issues.length,
            brokenAt: issues.length > 0 ? issues[0].auditId : undefined,
            issues: issues.length > 0 ? issues : undefined,
        };
    }
    /**
     * Query audit records with advanced filters
     *
     * @param filters - Query filters
     * @returns Matching audit records
     */
    async query(filters) {
        const conditions = ['tenant_id = $1'];
        const params = [filters.tenantId];
        let paramIndex = 2;
        if (filters.caseId) {
            conditions.push(`case_id = $${paramIndex++}`);
            params.push(filters.caseId);
        }
        if (filters.actorId) {
            conditions.push(`actor_id = $${paramIndex++}`);
            params.push(filters.actorId);
        }
        if (filters.action) {
            if (Array.isArray(filters.action)) {
                conditions.push(`action = ANY($${paramIndex++})`);
                params.push(filters.action);
            }
            else {
                conditions.push(`action = $${paramIndex++}`);
                params.push(filters.action);
            }
        }
        if (filters.startTime) {
            conditions.push(`timestamp >= $${paramIndex++}`);
            params.push(filters.startTime.toISOString());
        }
        if (filters.endTime) {
            conditions.push(`timestamp <= $${paramIndex++}`);
            params.push(filters.endTime.toISOString());
        }
        if (filters.legalBasis) {
            conditions.push(`legal_basis = $${paramIndex++}`);
            params.push(filters.legalBasis);
        }
        if (filters.authorityId) {
            conditions.push(`authority_id = $${paramIndex++}`);
            params.push(filters.authorityId);
        }
        const limit = Math.min(filters.limit || 100, 10000);
        const offset = filters.offset || 0;
        params.push(limit, offset);
        const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
        const result = await this.pool.query(sql, params);
        return result.rows.map(this.mapRow);
    }
    /**
     * Get audit statistics for a case
     */
    async getStats(caseId) {
        const statsResult = await this.pool.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT actor_id) as unique_actors,
        MIN(timestamp) as first_record,
        MAX(timestamp) as last_record
      FROM ${this.tableName}
      WHERE case_id = $1
      `, [caseId]);
        const actionCountsResult = await this.pool.query(`
      SELECT action, COUNT(*) as count
      FROM ${this.tableName}
      WHERE case_id = $1
      GROUP BY action
      `, [caseId]);
        const actionCounts = {};
        for (const row of actionCountsResult.rows) {
            actionCounts[row.action] = parseInt(row.count, 10);
        }
        // Quick chain verification (just check we have continuous prev_hash linkage)
        const verification = await this.verifyChain(caseId);
        const stats = statsResult.rows[0];
        return {
            totalRecords: parseInt(stats.total_records, 10),
            uniqueActors: parseInt(stats.unique_actors, 10),
            actionCounts,
            firstRecord: stats.first_record?.toISOString(),
            lastRecord: stats.last_record?.toISOString(),
            chainIntact: verification.ok,
        };
    }
    /**
     * Compute SHA-256 hash for an audit record
     *
     * Uses deterministic JSON serialization to ensure reproducible hashes
     */
    computeHash(data) {
        // Create canonical representation with sorted keys
        const canonical = {
            auditId: data.auditId,
            caseId: data.caseId,
            tenantId: data.tenantId,
            timestamp: data.timestamp,
            actorId: data.actorId,
            action: data.action,
            resourceType: data.resourceType ?? null,
            resourceId: data.resourceId ?? null,
            details: data.details ? this.sortObjectKeys(data.details) : null,
            reasonForAccess: data.reasonForAccess ?? null,
            legalBasis: data.legalBasis ?? null,
            authorityId: data.authorityId ?? null,
            prevHash: data.prevHash ?? null,
        };
        const json = JSON.stringify(canonical, Object.keys(canonical).sort());
        return (0, crypto_1.createHash)('sha256').update(json).digest('hex');
    }
    /**
     * Recursively sort object keys for deterministic serialization
     */
    sortObjectKeys(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => typeof item === 'object' && item !== null
                ? this.sortObjectKeys(item)
                : item);
        }
        const sorted = {};
        for (const key of Object.keys(obj).sort()) {
            const value = obj[key];
            sorted[key] =
                typeof value === 'object' && value !== null
                    ? this.sortObjectKeys(value)
                    : value;
        }
        return sorted;
    }
    /**
     * Map database row to domain object
     */
    mapRow(row) {
        return {
            auditId: row.audit_id,
            caseId: row.case_id,
            tenantId: row.tenant_id,
            timestamp: row.timestamp.toISOString(),
            actorId: row.actor_id,
            action: row.action,
            resourceType: row.resource_type || undefined,
            resourceId: row.resource_id || undefined,
            details: row.details || undefined,
            reasonForAccess: row.reason_for_access || undefined,
            legalBasis: row.legal_basis || undefined,
            authorityId: row.authority_id || undefined,
            policyDecision: row.policy_decision || undefined,
            sessionContext: row.session_context || undefined,
            prevHash: row.prev_hash || undefined,
            hash: row.hash,
        };
    }
}
exports.CaseAuditLogRepository = CaseAuditLogRepository;
/**
 * Factory function to create CaseAuditLogRepository
 */
function createCaseAuditLogRepository(pool) {
    return new CaseAuditLogRepository(pool);
}
exports.default = CaseAuditLogRepository;
