"use strict";
/**
 * CompanyOS Audit Service
 *
 * Handles audit logging for tenant operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const postgres_js_1 = require("../db/postgres.js");
const uuid_1 = require("uuid");
function rowToAuditEvent(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        eventType: row.event_type,
        action: row.action,
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        actorIp: row.actor_ip,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        changes: row.changes || {},
        metadata: row.metadata || {},
        createdAt: new Date(row.created_at),
    };
}
class AuditService {
    /**
     * Log an audit event
     */
    async logEvent(input) {
        const query = `
      INSERT INTO companyos_tenant_audit (
        id, tenant_id, event_type, action, actor_id, actor_email, actor_ip,
        resource_type, resource_id, changes, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            (0, uuid_1.v4)(),
            input.tenantId || null,
            input.eventType,
            input.action,
            input.actorId || null,
            input.actorEmail || null,
            input.actorIp || null,
            input.resourceType,
            input.resourceId || null,
            JSON.stringify(input.changes || {}),
            JSON.stringify(input.metadata || {}),
            new Date(),
        ];
        const result = await postgres_js_1.pool.query(query, values);
        return rowToAuditEvent(result.rows[0]);
    }
    /**
     * Log tenant creation
     */
    async logTenantCreated(tenantId, tenantData, actor) {
        return this.logEvent({
            tenantId,
            eventType: 'tenant_created',
            action: 'create',
            actorId: actor.id,
            actorEmail: actor.email,
            actorIp: actor.ip,
            resourceType: 'tenant',
            resourceId: tenantId,
            changes: { after: tenantData },
            metadata: { source: 'tenant-api' },
        });
    }
    /**
     * Log tenant update
     */
    async logTenantUpdated(tenantId, before, after, actor) {
        return this.logEvent({
            tenantId,
            eventType: 'tenant_updated',
            action: 'update',
            actorId: actor.id,
            actorEmail: actor.email,
            actorIp: actor.ip,
            resourceType: 'tenant',
            resourceId: tenantId,
            changes: { before, after },
            metadata: { source: 'tenant-api' },
        });
    }
    /**
     * Log tenant deletion
     */
    async logTenantDeleted(tenantId, actor) {
        return this.logEvent({
            tenantId,
            eventType: 'tenant_deleted',
            action: 'delete',
            actorId: actor.id,
            actorEmail: actor.email,
            actorIp: actor.ip,
            resourceType: 'tenant',
            resourceId: tenantId,
            changes: {},
            metadata: { source: 'tenant-api' },
        });
    }
    /**
     * Log feature flag change
     */
    async logFeatureFlagChanged(tenantId, flagName, enabled, actor) {
        return this.logEvent({
            tenantId,
            eventType: 'feature_flag_changed',
            action: enabled ? 'enable' : 'disable',
            actorId: actor.id,
            actorEmail: actor.email,
            actorIp: actor.ip,
            resourceType: 'feature_flag',
            resourceId: flagName,
            changes: { flagName, enabled },
            metadata: { source: 'tenant-api' },
        });
    }
    /**
     * Query audit events for a tenant
     */
    async getAuditEvents(options) {
        const { limit = 100, offset = 0 } = options;
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        if (options.tenantId) {
            conditions.push(`tenant_id = $${paramIndex++}`);
            values.push(options.tenantId);
        }
        if (options.eventType) {
            conditions.push(`event_type = $${paramIndex++}`);
            values.push(options.eventType);
        }
        if (options.action) {
            conditions.push(`action = $${paramIndex++}`);
            values.push(options.action);
        }
        if (options.actorId) {
            conditions.push(`actor_id = $${paramIndex++}`);
            values.push(options.actorId);
        }
        if (options.startDate) {
            conditions.push(`created_at >= $${paramIndex++}`);
            values.push(options.startDate);
        }
        if (options.endDate) {
            conditions.push(`created_at <= $${paramIndex++}`);
            values.push(options.endDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) FROM companyos_tenant_audit ${whereClause}`;
        const countResult = await postgres_js_1.pool.query(countQuery, values);
        const totalCount = parseInt(countResult.rows[0].count, 10);
        const dataQuery = `
      SELECT * FROM companyos_tenant_audit
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const dataResult = await postgres_js_1.pool.query(dataQuery, [...values, limit, offset]);
        const events = dataResult.rows.map(rowToAuditEvent);
        return { events, totalCount };
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
