"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRepository = exports.AuditRepository = void 0;
const postgres_js_1 = require("../postgres.js");
const logger_js_1 = require("../../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'AuditRepository' });
function rowToAuditEntry(row) {
    return {
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        previousValue: row.previous_value,
        newValue: row.new_value,
        tenantId: row.tenant_id,
        userId: row.user_id,
        userEmail: row.user_email,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
    };
}
class AuditRepository {
    /**
     * Log an audit entry.
     */
    async log(entityType, entityId, action, context, previousValue, newValue) {
        const result = await (0, postgres_js_1.query)(`INSERT INTO config_audit_log (
        entity_type, entity_id, action, previous_value, new_value,
        tenant_id, user_id, user_email, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
            entityType,
            entityId,
            action,
            previousValue ? JSON.stringify(previousValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            context.tenantId || null,
            context.userId,
            context.userEmail || null,
            context.ipAddress || null,
            context.userAgent || null,
        ]);
        const entry = rowToAuditEntry(result.rows[0]);
        log.debug({ entityType, entityId, action, userId: context.userId }, 'Audit entry logged');
        return entry;
    }
    /**
     * Get audit history for an entity.
     */
    async getEntityHistory(entityType, entityId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        const countResult = await (0, postgres_js_1.query)(`SELECT COUNT(*) as count FROM config_audit_log
       WHERE entity_type = $1 AND entity_id = $2`, [entityType, entityId]);
        const result = await (0, postgres_js_1.query)(`SELECT * FROM config_audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY timestamp DESC
       LIMIT $3 OFFSET $4`, [entityType, entityId, limit, offset]);
        return {
            entries: result.rows.map(rowToAuditEntry),
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Get audit logs by tenant.
     */
    async getByTenant(tenantId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        const conditions = ['tenant_id IS NOT DISTINCT FROM $1'];
        const params = [tenantId];
        let paramIndex = 2;
        if (options?.entityType) {
            conditions.push(`entity_type = $${paramIndex++}`);
            params.push(options.entityType);
        }
        if (options?.action) {
            conditions.push(`action = $${paramIndex++}`);
            params.push(options.action);
        }
        if (options?.startDate) {
            conditions.push(`timestamp >= $${paramIndex++}`);
            params.push(options.startDate);
        }
        if (options?.endDate) {
            conditions.push(`timestamp <= $${paramIndex++}`);
            params.push(options.endDate);
        }
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        const countResult = await (0, postgres_js_1.query)(`SELECT COUNT(*) as count FROM config_audit_log ${whereClause}`, params);
        const result = await (0, postgres_js_1.query)(`SELECT * FROM config_audit_log ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`, [...params, limit, offset]);
        return {
            entries: result.rows.map(rowToAuditEntry),
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Get recent audit logs by user.
     */
    async getByUser(userId, options) {
        const limit = options?.limit ?? 100;
        const offset = options?.offset ?? 0;
        const countResult = await (0, postgres_js_1.query)(`SELECT COUNT(*) as count FROM config_audit_log WHERE user_id = $1`, [userId]);
        const result = await (0, postgres_js_1.query)(`SELECT * FROM config_audit_log
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        return {
            entries: result.rows.map(rowToAuditEntry),
            total: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Prune old audit logs.
     */
    async prune(retentionDays) {
        const result = await (0, postgres_js_1.query)(`DELETE FROM config_audit_log
       WHERE timestamp < NOW() - INTERVAL '1 day' * $1`, [retentionDays]);
        const deleted = result.rowCount ?? 0;
        if (deleted > 0) {
            log.info({ deleted, retentionDays }, 'Pruned old audit logs');
        }
        return deleted;
    }
}
exports.AuditRepository = AuditRepository;
exports.auditRepository = new AuditRepository();
