"use strict";
// @ts-nocheck
/**
 * Redaction Service
 *
 * Handles Right to Be Forgotten (RTBF) requests for audit data.
 * Implements tombstone-based redaction that preserves audit chain integrity.
 *
 * Key Principles:
 * - Never silently delete audit history
 * - Replace redacted data with tombstones
 * - Maintain hash chain integrity (hashes of original data preserved)
 * - Full audit trail of redaction operations
 * - Multi-level approval workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionService = void 0;
const crypto_1 = require("crypto");
const events_1 = require("events");
/**
 * Default workflow configuration
 */
const DEFAULT_WORKFLOW_CONFIG = {
    requireApproval: true,
    minApprovals: 2,
    approverRoles: ['admin', 'privacy_officer', 'legal'],
    autoApprovalBases: ['court_order', 'regulatory_mandate'],
    gracePeriodMs: 24 * 60 * 60 * 1000, // 24 hours
};
/**
 * Redaction service for RTBF compliance
 */
class RedactionService extends events_1.EventEmitter {
    pool;
    store;
    config;
    workflowConfig;
    constructor(pool, store, config, workflowConfig = {}) {
        super();
        this.pool = pool;
        this.store = store;
        this.config = config;
        this.workflowConfig = { ...DEFAULT_WORKFLOW_CONFIG, ...workflowConfig };
    }
    /**
     * Initialize the redaction service (create tables)
     */
    async initialize() {
        await this.pool.query(`
      -- Redaction requests table
      CREATE TABLE IF NOT EXISTS audit_redaction_requests (
        id UUID PRIMARY KEY,
        requester_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        subject_user_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        legal_basis TEXT NOT NULL,
        verification_id TEXT,
        fields_to_redact TEXT[] NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending',
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        executed_at TIMESTAMPTZ,
        denied_by TEXT,
        denied_at TIMESTAMPTZ,
        denial_reason TEXT,
        grace_period_ends_at TIMESTAMPTZ,
        events_affected INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Redaction approvals table
      CREATE TABLE IF NOT EXISTS audit_redaction_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID NOT NULL REFERENCES audit_redaction_requests(id),
        approver_id TEXT NOT NULL,
        approver_role TEXT NOT NULL,
        decision TEXT NOT NULL CHECK (decision IN ('approve', 'deny')),
        reason TEXT,
        decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_redaction_requests_status ON audit_redaction_requests(status);
      CREATE INDEX IF NOT EXISTS idx_redaction_requests_tenant ON audit_redaction_requests(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_redaction_requests_subject ON audit_redaction_requests(subject_user_id);
      CREATE INDEX IF NOT EXISTS idx_redaction_approvals_request ON audit_redaction_approvals(request_id);
    `);
    }
    /**
     * Submit a new redaction request
     */
    async submitRequest(request) {
        const id = (0, crypto_1.randomUUID)();
        const requestedAt = new Date();
        // Check for auto-approval
        const autoApprove = this.workflowConfig.autoApprovalBases.includes(request.legalBasis);
        const status = autoApprove ? 'approved' : 'pending';
        const gracePeriodEndsAt = autoApprove
            ? new Date(Date.now() + this.workflowConfig.gracePeriodMs)
            : null;
        const fullRequest = {
            ...request,
            id,
            requestedAt,
            status,
            approvedAt: autoApprove ? new Date() : undefined,
            approvedBy: autoApprove ? 'system_auto_approval' : undefined,
        };
        await this.pool.query(`INSERT INTO audit_redaction_requests
       (id, requester_id, tenant_id, subject_user_id, reason, legal_basis, verification_id, fields_to_redact, requested_at, status, approved_at, approved_by, grace_period_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
            id,
            request.requesterId,
            request.tenantId,
            request.subjectUserId,
            request.reason,
            request.legalBasis,
            request.verificationId,
            request.fieldsToRedact,
            requestedAt,
            status,
            fullRequest.approvedAt,
            fullRequest.approvedBy,
            gracePeriodEndsAt,
        ]);
        // Log the request
        await this.logRedactionEvent('rtbf_request', fullRequest, {
            autoApproved: autoApprove,
        });
        this.emit('requestSubmitted', fullRequest);
        return fullRequest;
    }
    /**
     * Approve a redaction request
     */
    async approveRequest(requestId, approverId, approverRole, reason) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get the request
            const requestResult = await client.query('SELECT * FROM audit_redaction_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (requestResult.rows.length === 0) {
                throw new Error('Redaction request not found');
            }
            const request = requestResult.rows[0];
            if (request.status !== 'pending') {
                throw new Error(`Request is not pending: ${request.status}`);
            }
            // Check if approver has required role
            if (!this.workflowConfig.approverRoles.includes(approverRole)) {
                throw new Error(`Role ${approverRole} cannot approve redaction requests`);
            }
            // Record approval
            await client.query(`INSERT INTO audit_redaction_approvals (request_id, approver_id, approver_role, decision, reason)
         VALUES ($1, $2, $3, 'approve', $4)`, [requestId, approverId, approverRole, reason]);
            // Check if we have enough approvals
            const approvalsResult = await client.query(`SELECT COUNT(*) FROM audit_redaction_approvals WHERE request_id = $1 AND decision = 'approve'`, [requestId]);
            const approvalCount = parseInt(approvalsResult.rows[0].count, 10);
            let newStatus = 'pending';
            let gracePeriodEndsAt = null;
            if (approvalCount >= this.workflowConfig.minApprovals) {
                newStatus = 'approved';
                gracePeriodEndsAt = new Date(Date.now() + this.workflowConfig.gracePeriodMs);
                await client.query(`UPDATE audit_redaction_requests
           SET status = $1, approved_by = $2, approved_at = NOW(), grace_period_ends_at = $3
           WHERE id = $4`, [newStatus, approverId, gracePeriodEndsAt, requestId]);
            }
            await client.query('COMMIT');
            // Log the approval
            await this.logRedactionEvent('rtbf_approval', {
                id: requestId,
                requesterId: request.requester_id,
                tenantId: request.tenant_id,
                subjectUserId: request.subject_user_id,
                reason: request.reason,
                legalBasis: request.legal_basis,
                fieldsToRedact: request.fields_to_redact,
                requestedAt: request.requested_at,
                status: newStatus,
            }, {
                approverId,
                approverRole,
                approvalCount,
                fullyApproved: newStatus === 'approved',
            });
            const updatedRequest = {
                id: requestId,
                requesterId: request.requester_id,
                tenantId: request.tenant_id,
                subjectUserId: request.subject_user_id,
                reason: request.reason,
                legalBasis: request.legal_basis,
                verificationId: request.verification_id,
                fieldsToRedact: request.fields_to_redact,
                requestedAt: new Date(request.requested_at),
                status: newStatus,
                approvedBy: newStatus === 'approved' ? approverId : undefined,
                approvedAt: newStatus === 'approved' ? new Date() : undefined,
            };
            this.emit('requestApproved', updatedRequest);
            return updatedRequest;
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
     * Deny a redaction request
     */
    async denyRequest(requestId, denierId, denierRole, reason) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get the request
            const requestResult = await client.query('SELECT * FROM audit_redaction_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (requestResult.rows.length === 0) {
                throw new Error('Redaction request not found');
            }
            const request = requestResult.rows[0];
            if (request.status !== 'pending') {
                throw new Error(`Request is not pending: ${request.status}`);
            }
            // Record denial
            await client.query(`INSERT INTO audit_redaction_approvals (request_id, approver_id, approver_role, decision, reason)
         VALUES ($1, $2, $3, 'deny', $4)`, [requestId, denierId, denierRole, reason]);
            // Update request status
            await client.query(`UPDATE audit_redaction_requests
         SET status = 'denied', denied_by = $1, denied_at = NOW(), denial_reason = $2
         WHERE id = $3`, [denierId, reason, requestId]);
            await client.query('COMMIT');
            // Log the denial
            await this.logRedactionEvent('rtbf_denied', {
                id: requestId,
                requesterId: request.requester_id,
                tenantId: request.tenant_id,
                subjectUserId: request.subject_user_id,
                reason: request.reason,
                legalBasis: request.legal_basis,
                fieldsToRedact: request.fields_to_redact,
                requestedAt: request.requested_at,
                status: 'denied',
            }, {
                denierId,
                denierRole,
                denialReason: reason,
            });
            const updatedRequest = {
                id: requestId,
                requesterId: request.requester_id,
                tenantId: request.tenant_id,
                subjectUserId: request.subject_user_id,
                reason: request.reason,
                legalBasis: request.legal_basis,
                verificationId: request.verification_id,
                fieldsToRedact: request.fields_to_redact,
                requestedAt: new Date(request.requested_at),
                status: 'denied',
            };
            this.emit('requestDenied', updatedRequest);
            return updatedRequest;
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
     * Execute an approved redaction request
     */
    async executeRedaction(requestId, executorId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get the request
            const requestResult = await client.query('SELECT * FROM audit_redaction_requests WHERE id = $1 FOR UPDATE', [requestId]);
            if (requestResult.rows.length === 0) {
                throw new Error('Redaction request not found');
            }
            const request = requestResult.rows[0];
            if (request.status !== 'approved') {
                throw new Error(`Request is not approved: ${request.status}`);
            }
            // Check grace period
            if (request.grace_period_ends_at && new Date() < new Date(request.grace_period_ends_at)) {
                throw new Error(`Grace period not yet ended. Can execute after: ${request.grace_period_ends_at}`);
            }
            // Find events to redact
            const eventsResult = await client.query(`SELECT id, hash, tenant_id FROM audit_events
         WHERE user_id = $1 AND tenant_id = $2`, [request.subject_user_id, request.tenant_id]);
            const eventsToRedact = eventsResult.rows;
            let tombstonesCreated = 0;
            for (const event of eventsToRedact) {
                // Create tombstone
                const tombstone = {
                    eventId: event.id,
                    redactionRequestId: requestId,
                    redactedFields: request.fields_to_redact,
                    redactedAt: new Date(),
                    originalHash: event.hash,
                    reason: request.reason,
                    legalBasis: request.legal_basis,
                };
                // Insert tombstone
                await client.query(`INSERT INTO audit_redactions
           (event_id, redaction_request_id, redacted_fields, redacted_at, original_hash, reason, legal_basis)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    tombstone.eventId,
                    tombstone.redactionRequestId,
                    tombstone.redactedFields,
                    tombstone.redactedAt,
                    tombstone.originalHash,
                    tombstone.reason,
                    tombstone.legalBasis,
                ]);
                // Redact fields in the event (replace with redaction markers)
                const redactionMarker = '[REDACTED]';
                const updateParts = [];
                const updateValues = [];
                let paramIndex = 1;
                for (const field of request.fields_to_redact) {
                    switch (field) {
                        case 'userId':
                            updateParts.push(`user_id = $${paramIndex++}`);
                            updateValues.push(redactionMarker);
                            break;
                        case 'userName':
                            updateParts.push(`user_name = $${paramIndex++}`);
                            updateValues.push(redactionMarker);
                            break;
                        case 'userEmail':
                            updateParts.push(`user_email = $${paramIndex++}`);
                            updateValues.push(redactionMarker);
                            break;
                        case 'ipAddress':
                            updateParts.push(`ip_address = NULL`);
                            break;
                        case 'userAgent':
                            updateParts.push(`user_agent = $${paramIndex++}`);
                            updateValues.push(redactionMarker);
                            break;
                        case 'details':
                            updateParts.push(`details = $${paramIndex++}`);
                            updateValues.push(JSON.stringify({ redacted: true }));
                            break;
                        case 'oldValues':
                            updateParts.push(`old_values = $${paramIndex++}`);
                            updateValues.push(JSON.stringify({ redacted: true }));
                            break;
                        case 'newValues':
                            updateParts.push(`new_values = $${paramIndex++}`);
                            updateValues.push(JSON.stringify({ redacted: true }));
                            break;
                    }
                }
                // Mark as redacted
                updateParts.push(`redacted = true`);
                if (updateParts.length > 0) {
                    updateValues.push(event.id);
                    await client.query(`UPDATE audit_events SET ${updateParts.join(', ')} WHERE id = $${paramIndex}`, updateValues);
                }
                tombstonesCreated++;
            }
            // Update request status
            await client.query(`UPDATE audit_redaction_requests
         SET status = 'executed', executed_at = NOW(), events_affected = $1
         WHERE id = $2`, [eventsToRedact.length, requestId]);
            await client.query('COMMIT');
            // Log the execution
            await this.logRedactionEvent('rtbf_executed', {
                id: requestId,
                requesterId: request.requester_id,
                tenantId: request.tenant_id,
                subjectUserId: request.subject_user_id,
                reason: request.reason,
                legalBasis: request.legal_basis,
                fieldsToRedact: request.fields_to_redact,
                requestedAt: request.requested_at,
                status: 'executed',
                executedAt: new Date(),
            }, {
                executorId,
                eventsAffected: eventsToRedact.length,
                tombstonesCreated,
            });
            this.emit('redactionExecuted', {
                requestId,
                eventsAffected: eventsToRedact.length,
                tombstonesCreated,
            });
            return {
                eventsAffected: eventsToRedact.length,
                tombstonesCreated,
            };
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
     * Get events with redaction applied (redacted view)
     */
    async getRedactedEvents(eventIds, tenantId) {
        const result = await this.pool.query(`SELECT e.*, r.redacted_fields, r.redacted_at, r.original_hash, r.reason as redaction_reason, r.legal_basis as redaction_legal_basis
       FROM audit_events e
       LEFT JOIN audit_redactions r ON e.id = r.event_id
       WHERE e.id = ANY($1) AND e.tenant_id = $2`, [eventIds, tenantId]);
        return result.rows.map((row) => {
            const event = this.rowToEvent(row);
            if (row.redacted_fields) {
                return {
                    ...event,
                    tombstone: {
                        eventId: row.id,
                        redactionRequestId: row.redaction_request_id,
                        redactedFields: row.redacted_fields,
                        redactedAt: new Date(row.redacted_at),
                        originalHash: row.original_hash,
                        reason: row.redaction_reason,
                        legalBasis: row.redaction_legal_basis,
                    },
                };
            }
            return event;
        });
    }
    /**
     * Get pending redaction requests
     */
    async getPendingRequests(tenantId) {
        let query = 'SELECT * FROM audit_redaction_requests WHERE status = $1';
        const params = ['pending'];
        if (tenantId) {
            query += ' AND tenant_id = $2';
            params.push(tenantId);
        }
        query += ' ORDER BY requested_at ASC';
        const result = await this.pool.query(query, params);
        return result.rows.map((row) => ({
            id: row.id,
            requesterId: row.requester_id,
            tenantId: row.tenant_id,
            subjectUserId: row.subject_user_id,
            reason: row.reason,
            legalBasis: row.legal_basis,
            verificationId: row.verification_id,
            fieldsToRedact: row.fields_to_redact,
            requestedAt: new Date(row.requested_at),
            status: row.status,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
            executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
        }));
    }
    /**
     * Log redaction-related audit events
     */
    async logRedactionEvent(eventType, request, details) {
        await this.store.appendEvent({
            id: (0, crypto_1.randomUUID)(),
            eventType,
            level: 'warn',
            timestamp: new Date(),
            version: '1.0.0',
            correlationId: request.id || (0, crypto_1.randomUUID)(),
            tenantId: request.tenantId || 'system',
            serviceId: 'audit-blackbox-service',
            serviceName: 'Audit Black Box Service',
            environment: this.config.postgres.host.includes('prod') ? 'production' : 'development',
            userId: request.requesterId,
            action: eventType,
            outcome: request.status === 'denied' ? 'denied' : request.status === 'executed' ? 'success' : 'pending',
            message: `RTBF ${eventType} for user ${request.subjectUserId}`,
            details: {
                requestId: request.id,
                subjectUserId: request.subjectUserId,
                fieldsToRedact: request.fieldsToRedact,
                legalBasis: request.legalBasis,
                ...details,
            },
            criticalCategory: 'data_lifecycle',
            complianceRelevant: true,
            complianceFrameworks: ['GDPR', 'CCPA'],
        });
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
            userId: row.user_id,
            tenantId: row.tenant_id,
            serviceId: row.service_id,
            serviceName: row.service_name,
            environment: row.environment,
            action: row.action,
            outcome: row.outcome,
            message: row.message,
            details: row.details || {},
            complianceRelevant: row.compliance_relevant,
            complianceFrameworks: row.compliance_frameworks || [],
            redacted: row.redacted,
        };
    }
}
exports.RedactionService = RedactionService;
