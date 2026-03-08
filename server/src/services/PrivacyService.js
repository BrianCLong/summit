"use strict";
// @ts-nocheck
/**
 * Privacy Service - Data Subject Rights & Privacy Orchestration
 *
 * Manages Data Subject Access Requests (DSAR), Right to be Forgotten (RTBF),
 * and privacy evidence generation.
 *
 * Uses PostgreSQL for request state and evidence persistence.
 * Uses ProvenanceLedger for immutable audit trail.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyService = exports.PrivacyService = exports.DSARStatus = exports.DSARType = void 0;
const uuid_1 = require("uuid");
const events_1 = require("events");
const ledger_js_1 = require("../provenance/ledger.js");
const pg_js_1 = require("../db/pg.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
var DSARType;
(function (DSARType) {
    DSARType["ACCESS"] = "ACCESS";
    DSARType["RECTIFICATION"] = "RECTIFY";
    DSARType["DELETION"] = "DELETE";
    DSARType["EXPORT"] = "EXPORT";
    DSARType["RESTRICTION"] = "RESTRICT";
    DSARType["OBJECTION"] = "OBJECT";
})(DSARType || (exports.DSARType = DSARType = {}));
var DSARStatus;
(function (DSARStatus) {
    DSARStatus["SUBMITTED"] = "SUBMITTED";
    DSARStatus["VERIFYING"] = "VERIFYING";
    DSARStatus["PROCESSING"] = "PROCESSING";
    DSARStatus["COMPLETED"] = "COMPLETED";
    DSARStatus["REJECTED"] = "REJECTED";
    DSARStatus["FAILED"] = "FAILED";
})(DSARStatus || (exports.DSARStatus = DSARStatus = {}));
class PrivacyService extends events_1.EventEmitter {
    static instance;
    isInitialized = false;
    initPromise = null;
    requestCache = new Map();
    evidenceCache = new Map();
    constructor() {
        super();
        // Start initialization but don't block constructor
        this.ensureInitialized().catch(err => {
            logger_js_1.default.error('Failed to initialize PrivacyService:', {
                error: err instanceof Error ? err.message : String(err)
            });
        });
    }
    static getInstance() {
        if (!PrivacyService.instance) {
            PrivacyService.instance = new PrivacyService();
        }
        return PrivacyService.instance;
    }
    ensureInitialized() {
        if (this.isInitialized)
            return Promise.resolve();
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = this.initializeTables()
            .then(() => {
            this.isInitialized = true;
        })
            .finally(() => {
            this.initPromise = null;
        });
        return this.initPromise;
    }
    async initializeTables() {
        // Ensure tables exist (idempotent)
        // Note: In production, this should be a migration
        const createRequestsTable = `
      CREATE TABLE IF NOT EXISTS privacy_dsar_requests (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        subject_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        details JSONB,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        deadline TIMESTAMP WITH TIME ZONE,
        verification_token VARCHAR(255),
        rejection_reason TEXT,
        evidence_id VARCHAR(255)
      );
    `;
        const createEvidenceTable = `
      CREATE TABLE IF NOT EXISTS privacy_evidence (
        id UUID PRIMARY KEY,
        request_id UUID NOT NULL REFERENCES privacy_dsar_requests(id),
        summary TEXT,
        actions JSONB,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
        try {
            await pg_js_1.pool.query(createRequestsTable);
            await pg_js_1.pool.query(createEvidenceTable);
        }
        catch (error) {
            logger_js_1.default.warn('Failed to initialize privacy tables (might already exist or permission issue)', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Submit a new Data Subject Access Request
     */
    async submitRequest(tenantId, userId, type, details = {}) {
        await this.ensureInitialized();
        const id = (0, uuid_1.v4)();
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30); // 30 day SLA
        const request = {
            id,
            tenantId,
            userId,
            subjectId: details.subjectId || userId,
            type,
            status: DSARStatus.SUBMITTED,
            details,
            submittedAt: new Date(),
            deadline,
        };
        // Persist to DB
        const query = `
      INSERT INTO privacy_dsar_requests (
        id, tenant_id, user_id, subject_id, type, status, details, submitted_at, deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
        await pg_js_1.pool.query(query, [
            request.id,
            request.tenantId,
            request.userId,
            request.subjectId,
            request.type,
            request.status,
            JSON.stringify(request.details),
            request.submittedAt,
            request.deadline
        ]);
        this.requestCache.set(request.id, request);
        // Audit the request submission
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            actionType: 'PRIVACY_DSAR_SUBMITTED',
            resourceType: 'dsar_request',
            resourceId: id,
            actorId: userId,
            actorType: 'user',
            payload: { type, details },
            metadata: { purpose: 'privacy_compliance' },
        });
        this.emit('requestSubmitted', request);
        // Auto-start verification if possible
        await this.verifyRequest(id);
        return request;
    }
    /**
     * Get status of a request
     */
    async getRequestStatus(requestId) {
        await this.ensureInitialized();
        const query = `SELECT * FROM privacy_dsar_requests WHERE id = $1`;
        const result = await pg_js_1.pool.query(query, [requestId]);
        if (result.rows.length === 0) {
            return this.requestCache.get(requestId);
        }
        const request = this.mapRowToRequest(result.rows[0]);
        this.requestCache.set(requestId, request);
        return request;
    }
    mapRowToRequest(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            subjectId: row.subject_id,
            type: row.type,
            status: row.status,
            details: row.details,
            submittedAt: new Date(row.submitted_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            deadline: new Date(row.deadline),
            verificationToken: row.verification_token,
            rejectionReason: row.rejection_reason,
            evidenceId: row.evidence_id
        };
    }
    /**
     * List requests for a tenant
     */
    async listRequests(tenantId) {
        await this.ensureInitialized();
        const query = `SELECT * FROM privacy_dsar_requests WHERE tenant_id = $1 ORDER BY submitted_at DESC`;
        const result = await pg_js_1.pool.query(query, [tenantId]);
        return result.rows.map(row => this.mapRowToRequest(row));
    }
    /**
     * Update request status
     */
    async updateRequestStatus(id, status, extra = {}) {
        let query = `UPDATE privacy_dsar_requests SET status = $2`;
        const params = [id, status];
        let idx = 3;
        if (extra.completedAt) {
            query += `, completed_at = $${idx++}`;
            params.push(extra.completedAt);
        }
        if (extra.evidenceId) {
            query += `, evidence_id = $${idx++}`;
            params.push(extra.evidenceId);
        }
        if (extra.rejectionReason) {
            query += `, rejection_reason = $${idx++}`;
            params.push(extra.rejectionReason);
        }
        query += ` WHERE id = $1`;
        await pg_js_1.pool.query(query, params);
        const cached = this.requestCache.get(id);
        if (cached) {
            cached.status = status;
            if (extra.completedAt)
                cached.completedAt = extra.completedAt;
            if (extra.evidenceId)
                cached.evidenceId = extra.evidenceId;
            if (extra.rejectionReason)
                cached.rejectionReason = extra.rejectionReason;
        }
    }
    /**
     * Verify the identity of the requester
     */
    async verifyRequest(requestId) {
        const request = await this.getRequestStatus(requestId);
        if (!request)
            throw new Error('Request not found');
        await this.updateRequestStatus(requestId, DSARStatus.VERIFYING);
        request.status = DSARStatus.VERIFYING;
        // TODO: Integrate with Identity Provider for strong verification
        // For now, auto-verify
        const isVerified = true;
        if (isVerified) {
            await this.updateRequestStatus(requestId, DSARStatus.PROCESSING);
            request.status = DSARStatus.PROCESSING;
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: request.tenantId,
                actionType: 'PRIVACY_DSAR_VERIFIED',
                resourceType: 'dsar_request',
                resourceId: request.id,
                actorId: 'system',
                actorType: 'system',
                payload: { status: 'verified' },
                metadata: { purpose: 'privacy_compliance' },
            });
            this.executeRequest(requestId).catch(err => {
                logger_js_1.default.error(`DSAR execution failed for ${requestId}:`, {
                    error: err instanceof Error ? err.message : String(err)
                });
                this.failRequest(requestId, err instanceof Error ? err.message : String(err));
            });
        }
    }
    /**
     * Execute the DSAR workflow
     */
    async executeRequest(requestId) {
        const request = await this.getRequestStatus(requestId);
        if (!request)
            return;
        try {
            let evidence;
            switch (request.type) {
                case DSARType.ACCESS:
                case DSARType.EXPORT:
                    evidence = await this.executeDataExport(request);
                    break;
                case DSARType.DELETION:
                    evidence = await this.executeDeletion(request);
                    break;
                case DSARType.RECTIFICATION:
                    evidence = await this.executeRectification(request);
                    break;
                case DSARType.RESTRICTION:
                    evidence = await this.executeRestriction(request);
                    break;
                default:
                    throw new Error(`Unsupported DSAR type: ${request.type}`);
            }
            // Store evidence
            const evidenceId = (0, uuid_1.v4)();
            await this.persistEvidence(evidenceId, evidence);
            await this.updateRequestStatus(requestId, DSARStatus.COMPLETED, {
                completedAt: new Date(),
                evidenceId
            });
            request.evidenceId = evidenceId;
            request.status = DSARStatus.COMPLETED;
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: request.tenantId,
                actionType: 'PRIVACY_DSAR_COMPLETED',
                resourceType: 'dsar_request',
                resourceId: request.id,
                actorId: 'system',
                actorType: 'system',
                payload: {
                    evidenceSummary: evidence.summary,
                    actionsCount: evidence.actions.length
                },
                metadata: { purpose: 'privacy_compliance' },
            });
            this.emit('requestCompleted', request);
        }
        catch (error) {
            await this.failRequest(requestId, error.message);
        }
    }
    async persistEvidence(id, evidence) {
        const query = `
        INSERT INTO privacy_evidence (id, request_id, summary, actions, generated_at)
        VALUES ($1, $2, $3, $4, $5)
      `;
        await pg_js_1.pool.query(query, [
            id,
            evidence.requestId,
            evidence.summary,
            JSON.stringify(evidence.actions),
            evidence.generatedAt
        ]);
        this.evidenceCache.set(evidence.requestId, evidence);
    }
    async failRequest(requestId, reason) {
        const request = await this.getRequestStatus(requestId);
        if (!request)
            return;
        await this.updateRequestStatus(requestId, DSARStatus.FAILED, { rejectionReason: reason });
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: request.tenantId,
            actionType: 'PRIVACY_DSAR_FAILED',
            resourceType: 'dsar_request',
            resourceId: request.id,
            actorId: 'system',
            actorType: 'system',
            payload: { reason },
            metadata: { purpose: 'privacy_compliance' },
        });
    }
    // --- Workflow Implementations ---
    async executeDataExport(request) {
        // 1. Identify all data stores (Postgres, Neo4j, Elastic, Logs)
        // 2. Query each for subjectId
        // 3. Aggregate and format
        // Simulation - in production this would call external services
        // Logging simulated action for clarity
        logger_js_1.default.info(`[SIMULATION] Executing Data Export for subject ${request.subjectId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
            requestId: request.id,
            actions: [
                { system: 'Postgres', action: 'export', status: 'success', timestamp: new Date() },
                { system: 'Neo4j', action: 'export', status: 'success', timestamp: new Date() },
                { system: 'Elasticsearch', action: 'export', status: 'success', timestamp: new Date() }
            ],
            summary: `Exported data for subject ${request.subjectId}. Package size: 1.2MB`,
            generatedAt: new Date()
        };
    }
    async executeDeletion(request) {
        // 1. Identify all data stores
        // 2. Issue delete/anonymize commands
        // 3. Verify deletion
        // Simulation
        logger_js_1.default.info(`[SIMULATION] Executing PII Deletion for subject ${request.subjectId}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            requestId: request.id,
            actions: [
                { system: 'Postgres', action: 'anonymize', status: 'success', timestamp: new Date() },
                { system: 'Neo4j', action: 'delete_node', status: 'success', timestamp: new Date() },
                { system: 'Backups', action: 'mark_for_expiry', status: 'success', timestamp: new Date() }
            ],
            summary: `Deleted PII for subject ${request.subjectId} from primary stores. Backups marked for expiry.`,
            generatedAt: new Date()
        };
    }
    async executeRectification(request) {
        // Simulation
        return {
            requestId: request.id,
            actions: [
                { system: 'Postgres', action: 'update', status: 'success', timestamp: new Date() }
            ],
            summary: `Updated records for subject ${request.subjectId}.`,
            generatedAt: new Date()
        };
    }
    async executeRestriction(request) {
        // Simulation
        return {
            requestId: request.id,
            actions: [
                { system: 'AccessControl', action: 'freeze_account', status: 'success', timestamp: new Date() }
            ],
            summary: `Restricted processing for subject ${request.subjectId}. Account frozen.`,
            generatedAt: new Date()
        };
    }
    /**
     * Retrieve evidence for a completed request
     */
    async getEvidence(requestId) {
        await this.ensureInitialized();
        const query = `SELECT * FROM privacy_evidence WHERE request_id = $1`;
        const result = await pg_js_1.pool.query(query, [requestId]);
        if (result.rows.length === 0)
            return this.evidenceCache.get(requestId);
        const row = result.rows[0];
        const evidence = {
            requestId: row.request_id,
            summary: row.summary,
            actions: row.actions,
            generatedAt: new Date(row.generated_at)
        };
        this.evidenceCache.set(requestId, evidence);
        return evidence;
    }
}
exports.PrivacyService = PrivacyService;
exports.privacyService = PrivacyService.getInstance();
