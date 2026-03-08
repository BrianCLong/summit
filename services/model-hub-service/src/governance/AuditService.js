"use strict";
/**
 * Audit Service
 *
 * Provides comprehensive audit logging for all model hub operations:
 * - Model and version lifecycle events
 * - Deployment and routing changes
 * - Approval workflows
 * - Evaluation results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const connection_js_1 = require("../db/connection.js");
const id_js_1 = require("../utils/id.js");
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
// ============================================================================
// Row Transformation
// ============================================================================
function rowToAuditEvent(row) {
    return {
        id: row.id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        actorId: row.actor_id,
        actorType: row.actor_type,
        tenantId: row.tenant_id || undefined,
        changes: row.changes || undefined,
        metadata: row.metadata,
        ipAddress: row.ip_address || undefined,
        userAgent: row.user_agent || undefined,
        timestamp: row.timestamp,
    };
}
class AuditService {
    log = (0, logger_js_1.createChildLogger)({ component: 'AuditService' });
    /**
     * Record an audit event
     */
    async recordEvent(input, client) {
        const id = (0, id_js_1.generateId)();
        const now = new Date();
        const query = `
      INSERT INTO model_hub_audit_events (
        id, event_type, entity_type, entity_id, actor_id, actor_type,
        tenant_id, changes, metadata, ip_address, user_agent, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const params = [
            id,
            input.eventType,
            input.entityType,
            input.entityId,
            input.actorId,
            input.actorType,
            input.tenantId || null,
            input.changes || null,
            input.metadata || {},
            input.ipAddress || null,
            input.userAgent || null,
            now,
        ];
        const result = await connection_js_1.db.query(query, params, client);
        const event = rowToAuditEvent(result.rows[0]);
        this.log.debug({
            message: 'Audit event recorded',
            eventType: event.eventType,
            entityType: event.entityType,
            entityId: event.entityId,
            actorId: event.actorId,
        });
        return event;
    }
    /**
     * Get an audit event by ID
     */
    async getAuditEvent(id, client) {
        const query = 'SELECT * FROM model_hub_audit_events WHERE id = $1';
        const result = await connection_js_1.db.query(query, [id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('AuditEvent', id);
        }
        return rowToAuditEvent(result.rows[0]);
    }
    /**
     * List audit events with filtering
     */
    async listAuditEvents(options = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.entityType) {
            conditions.push(`entity_type = $${paramIndex++}`);
            params.push(options.entityType);
        }
        if (options.entityId) {
            conditions.push(`entity_id = $${paramIndex++}`);
            params.push(options.entityId);
        }
        if (options.actorId) {
            conditions.push(`actor_id = $${paramIndex++}`);
            params.push(options.actorId);
        }
        if (options.eventType) {
            conditions.push(`event_type = $${paramIndex++}`);
            params.push(options.eventType);
        }
        if (options.tenantId) {
            conditions.push(`tenant_id = $${paramIndex++}`);
            params.push(options.tenantId);
        }
        if (options.startDate) {
            conditions.push(`timestamp >= $${paramIndex++}`);
            params.push(options.startDate);
        }
        if (options.endDate) {
            conditions.push(`timestamp <= $${paramIndex++}`);
            params.push(options.endDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = options.limit || 100;
        const offset = options.offset || 0;
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM model_hub_audit_events ${whereClause}`;
        const countResult = await connection_js_1.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const query = `
      SELECT * FROM model_hub_audit_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const result = await connection_js_1.db.query(query, [...params, limit, offset]);
        const events = result.rows.map(rowToAuditEvent);
        return { events, total };
    }
    /**
     * Get audit trail for a specific entity
     */
    async getEntityAuditTrail(entityType, entityId, limit = 100) {
        const { events } = await this.listAuditEvents({
            entityType,
            entityId,
            limit,
        });
        return events;
    }
    /**
     * Get recent activity for an actor
     */
    async getActorActivity(actorId, limit = 50) {
        const { events } = await this.listAuditEvents({
            actorId,
            limit,
        });
        return events;
    }
    /**
     * Helper to record model lifecycle events
     */
    async recordModelEvent(eventType, modelId, actorId, changes, metadata) {
        return this.recordEvent({
            eventType,
            entityType: 'model',
            entityId: modelId,
            actorId,
            actorType: 'user',
            changes,
            metadata,
        });
    }
    /**
     * Helper to record model version events
     */
    async recordModelVersionEvent(eventType, modelVersionId, actorId, changes, metadata) {
        return this.recordEvent({
            eventType,
            entityType: 'model_version',
            entityId: modelVersionId,
            actorId,
            actorType: 'user',
            changes,
            metadata,
        });
    }
    /**
     * Helper to record deployment events
     */
    async recordDeploymentEvent(eventType, deploymentId, actorId, changes, metadata) {
        return this.recordEvent({
            eventType,
            entityType: 'deployment',
            entityId: deploymentId,
            actorId,
            actorType: 'user',
            changes,
            metadata,
        });
    }
    /**
     * Helper to record approval events
     */
    async recordApprovalEvent(eventType, approvalId, actorId, changes, metadata) {
        return this.recordEvent({
            eventType,
            entityType: 'approval',
            entityId: approvalId,
            actorId,
            actorType: 'user',
            changes,
            metadata,
        });
    }
}
exports.AuditService = AuditService;
// Export singleton instance
exports.auditService = new AuditService();
