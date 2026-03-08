"use strict";
/**
 * Audit Access Log Repository - Immutable audit logging for case access
 * Implements append-only logging with reason-for-access and legal basis tracking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAccessLogRepo = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const repoLogger = logger_js_1.default.child({ name: 'AuditAccessLogRepo' });
class AuditAccessLogRepo {
    pg;
    lastHash = '';
    constructor(pg) {
        this.pg = pg;
        this.initializeLastHash();
    }
    /**
     * Initialize the last hash from the database
     */
    async initializeLastHash() {
        try {
            const { rows } = await this.pg.query(`SELECT hash FROM maestro.audit_access_logs
         ORDER BY created_at DESC LIMIT 1`);
            if (rows[0]?.hash) {
                this.lastHash = rows[0].hash;
            }
        }
        catch (error) {
            repoLogger.warn({ error: error.message }, 'Failed to initialize last hash');
        }
    }
    /**
     * Log an access event - PRIMARY FUNCTION
     * This is the main entry point for recording access to cases
     */
    async logAccess(input) {
        // Validate required fields
        if (!input.reason || input.reason.trim() === '') {
            throw new Error('Reason is required for audit logging. Access denied without proper justification.');
        }
        if (!input.legalBasis) {
            throw new Error('Legal basis is required for audit logging. Access denied without legal justification.');
        }
        const id = (0, crypto_1.randomUUID)();
        // Calculate hash for integrity
        const hash = this.calculateHash({
            id,
            tenantId: input.tenantId,
            caseId: input.caseId,
            userId: input.userId,
            action: input.action,
            reason: input.reason,
            legalBasis: input.legalBasis,
            timestamp: new Date(),
        });
        const previousHash = this.lastHash || null;
        this.lastHash = hash;
        try {
            const { rows } = (await this.pg.query(`INSERT INTO maestro.audit_access_logs (
          id, tenant_id, case_id, user_id, action, resource_type, resource_id,
          reason, legal_basis, warrant_id, authority_reference, approval_chain,
          ip_address, user_agent, session_id, request_id, correlation_id,
          hash, previous_hash, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`, [
                id,
                input.tenantId,
                input.caseId,
                input.userId,
                input.action,
                input.resourceType || null,
                input.resourceId || null,
                input.reason,
                input.legalBasis,
                input.warrantId || null,
                input.authorityReference || null,
                JSON.stringify(input.approvalChain || []),
                input.ipAddress || null,
                input.userAgent || null,
                input.sessionId || null,
                input.requestId || null,
                input.correlationId || null,
                hash,
                previousHash,
                JSON.stringify(input.metadata || {}),
            ]));
            const log = this.mapRow(rows[0]);
            repoLogger.info({
                logId: id,
                tenantId: input.tenantId,
                caseId: input.caseId,
                userId: input.userId,
                action: input.action,
                legalBasis: input.legalBasis,
            }, 'Access logged to audit trail');
            return log;
        }
        catch (error) {
            repoLogger.error({
                error: error.message,
                input,
            }, 'Failed to log access');
            throw error;
        }
    }
    /**
     * Query audit logs with advanced filtering
     */
    async query(query) {
        const params = [query.tenantId];
        let sql = `SELECT * FROM maestro.audit_access_logs WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (query.caseId) {
            sql += ` AND case_id = $${paramIndex}`;
            params.push(query.caseId);
            paramIndex++;
        }
        if (query.userId) {
            sql += ` AND user_id = $${paramIndex}`;
            params.push(query.userId);
            paramIndex++;
        }
        if (query.action) {
            sql += ` AND action = $${paramIndex}`;
            params.push(query.action);
            paramIndex++;
        }
        if (query.legalBasis) {
            sql += ` AND legal_basis = $${paramIndex}`;
            params.push(query.legalBasis);
            paramIndex++;
        }
        if (query.startTime) {
            sql += ` AND created_at >= $${paramIndex}`;
            params.push(query.startTime);
            paramIndex++;
        }
        if (query.endTime) {
            sql += ` AND created_at <= $${paramIndex}`;
            params.push(query.endTime);
            paramIndex++;
        }
        if (query.warrantId) {
            sql += ` AND warrant_id = $${paramIndex}`;
            params.push(query.warrantId);
            paramIndex++;
        }
        if (query.correlationId) {
            sql += ` AND correlation_id = $${paramIndex}`;
            params.push(query.correlationId);
            paramIndex++;
        }
        sql += ` ORDER BY created_at DESC`;
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
        const { rows } = (await this.pg.query(sql, params));
        return rows.map(this.mapRow);
    }
    /**
     * Get audit logs for a specific case
     */
    async getLogsForCase(caseId, tenantId, limit = 100) {
        return this.query({ tenantId, caseId, limit });
    }
    /**
     * Get audit logs for a specific user
     */
    async getLogsForUser(userId, tenantId, limit = 100) {
        return this.query({ tenantId, userId, limit });
    }
    /**
     * Get audit logs by correlation ID (for tracking related operations)
     */
    async getLogsByCorrelationId(correlationId, tenantId) {
        return this.query({ tenantId, correlationId });
    }
    /**
     * Count audit logs with filters
     */
    async count(query) {
        const params = [query.tenantId];
        let sql = `SELECT COUNT(*) as count FROM maestro.audit_access_logs WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (query.caseId) {
            sql += ` AND case_id = $${paramIndex}`;
            params.push(query.caseId);
            paramIndex++;
        }
        if (query.userId) {
            sql += ` AND user_id = $${paramIndex}`;
            params.push(query.userId);
            paramIndex++;
        }
        if (query.action) {
            sql += ` AND action = $${paramIndex}`;
            params.push(query.action);
            paramIndex++;
        }
        if (query.legalBasis) {
            sql += ` AND legal_basis = $${paramIndex}`;
            params.push(query.legalBasis);
            paramIndex++;
        }
        if (query.startTime) {
            sql += ` AND created_at >= $${paramIndex}`;
            params.push(query.startTime);
            paramIndex++;
        }
        if (query.endTime) {
            sql += ` AND created_at <= $${paramIndex}`;
            params.push(query.endTime);
            paramIndex++;
        }
        if (query.warrantId) {
            sql += ` AND warrant_id = $${paramIndex}`;
            params.push(query.warrantId);
            paramIndex++;
        }
        if (query.correlationId) {
            sql += ` AND correlation_id = $${paramIndex}`;
            params.push(query.correlationId);
            paramIndex++;
        }
        const { rows } = await this.pg.query(sql, params);
        return parseInt(rows[0]?.count || '0', 10);
    }
    /**
     * Verify audit trail integrity
     */
    async verifyIntegrity(tenantId, startDate, endDate) {
        const logs = await this.query({
            tenantId,
            startTime: startDate,
            endTime: endDate,
            limit: 10000,
        });
        let validLogs = 0;
        const invalidLogs = [];
        let expectedPreviousHash = undefined;
        for (const log of logs.reverse()) {
            // Verify hash
            const calculatedHash = this.calculateHash({
                id: log.id,
                tenantId: log.tenantId,
                caseId: log.caseId,
                userId: log.userId,
                action: log.action,
                reason: log.reason,
                legalBasis: log.legalBasis,
                timestamp: log.createdAt,
            });
            if (log.hash !== calculatedHash) {
                invalidLogs.push({
                    id: log.id,
                    issue: 'Hash mismatch - possible tampering',
                });
                continue;
            }
            // Verify chain integrity
            if (expectedPreviousHash !== undefined &&
                log.previousHash !== expectedPreviousHash) {
                invalidLogs.push({
                    id: log.id,
                    issue: 'Chain integrity violation',
                });
            }
            expectedPreviousHash = log.hash;
            validLogs++;
        }
        const result = {
            valid: invalidLogs.length === 0,
            totalLogs: logs.length,
            validLogs,
            invalidLogs,
        };
        repoLogger.info(result, 'Audit trail integrity verification completed');
        return result;
    }
    /**
     * Calculate hash for integrity verification
     */
    calculateHash(data) {
        const hashableData = {
            id: data.id,
            tenantId: data.tenantId,
            caseId: data.caseId,
            userId: data.userId,
            action: data.action,
            reason: data.reason,
            legalBasis: data.legalBasis,
            timestamp: data.timestamp.toISOString(),
        };
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(hashableData, Object.keys(hashableData).sort()))
            .digest('hex');
    }
    /**
     * Map database row to domain object
     */
    mapRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            caseId: row.case_id,
            userId: row.user_id,
            action: row.action,
            resourceType: row.resource_type || undefined,
            resourceId: row.resource_id || undefined,
            reason: row.reason,
            legalBasis: row.legal_basis,
            warrantId: row.warrant_id || undefined,
            authorityReference: row.authority_reference || undefined,
            approvalChain: row.approval_chain || [],
            ipAddress: row.ip_address || undefined,
            userAgent: row.user_agent || undefined,
            sessionId: row.session_id || undefined,
            requestId: row.request_id || undefined,
            correlationId: row.correlation_id || undefined,
            createdAt: row.created_at,
            hash: row.hash || undefined,
            previousHash: row.previous_hash || undefined,
            metadata: row.metadata || {},
        };
    }
}
exports.AuditAccessLogRepo = AuditAccessLogRepo;
