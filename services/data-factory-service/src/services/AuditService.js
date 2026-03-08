"use strict";
/**
 * Data Factory Service - Audit Service
 *
 * Provides comprehensive audit logging for all operations in the data factory.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'audit-service' });
class AuditService {
    async log(request) {
        const id = (0, uuid_1.v4)();
        const timestamp = new Date();
        await (0, connection_js_1.query)(`INSERT INTO audit_log (
        id, entity_type, entity_id, action, actor_id, actor_role,
        timestamp, previous_state, new_state, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            id,
            request.entityType,
            request.entityId,
            request.action,
            request.actorId,
            request.actorRole,
            timestamp,
            request.previousState ? JSON.stringify(request.previousState) : null,
            request.newState ? JSON.stringify(request.newState) : null,
            JSON.stringify(request.metadata || {}),
        ]);
        logger.debug({
            auditId: id,
            entityType: request.entityType,
            entityId: request.entityId,
            action: request.action,
            actorId: request.actorId,
        }, 'Audit entry created');
        return {
            id,
            entityType: request.entityType,
            entityId: request.entityId,
            action: request.action,
            actorId: request.actorId,
            actorRole: request.actorRole,
            timestamp,
            previousState: request.previousState,
            newState: request.newState,
            metadata: request.metadata || {},
        };
    }
    async getByEntity(entityType, entityId, limit = 100) {
        const result = await (0, connection_js_1.query)(`SELECT * FROM audit_log
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY timestamp DESC
       LIMIT $3`, [entityType, entityId, limit]);
        return result.rows.map((row) => this.mapRowToEntry(row));
    }
    async getByActor(actorId, limit = 100) {
        const result = await (0, connection_js_1.query)(`SELECT * FROM audit_log
       WHERE actor_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`, [actorId, limit]);
        return result.rows.map((row) => this.mapRowToEntry(row));
    }
    async search(filters, limit = 100) {
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        if (filters.entityType) {
            conditions.push(`entity_type = $${paramIndex++}`);
            values.push(filters.entityType);
        }
        if (filters.action) {
            conditions.push(`action = $${paramIndex++}`);
            values.push(filters.action);
        }
        if (filters.actorId) {
            conditions.push(`actor_id = $${paramIndex++}`);
            values.push(filters.actorId);
        }
        if (filters.startDate) {
            conditions.push(`timestamp >= $${paramIndex++}`);
            values.push(filters.startDate);
        }
        if (filters.endDate) {
            conditions.push(`timestamp <= $${paramIndex++}`);
            values.push(filters.endDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await (0, connection_js_1.query)(`SELECT * FROM audit_log ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex}`, [...values, limit]);
        return result.rows.map((row) => this.mapRowToEntry(row));
    }
    async getStatistics(startDate, endDate) {
        const totalResult = await (0, connection_js_1.query)(`SELECT COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2`, [startDate, endDate]);
        const entityTypeResult = await (0, connection_js_1.query)(`SELECT entity_type, COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY entity_type`, [startDate, endDate]);
        const actionResult = await (0, connection_js_1.query)(`SELECT action, COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY action`, [startDate, endDate]);
        const actorResult = await (0, connection_js_1.query)(`SELECT actor_id, COUNT(*) as count FROM audit_log
       WHERE timestamp >= $1 AND timestamp <= $2
       GROUP BY actor_id
       ORDER BY count DESC
       LIMIT 20`, [startDate, endDate]);
        const byEntityType = {};
        for (const row of entityTypeResult.rows) {
            byEntityType[row.entity_type] = parseInt(row.count, 10);
        }
        const byAction = {};
        for (const row of actionResult.rows) {
            byAction[row.action] = parseInt(row.count, 10);
        }
        return {
            totalEntries: parseInt(totalResult.rows[0].count, 10),
            byEntityType,
            byAction,
            byActor: actorResult.rows.map((row) => ({
                actorId: row.actor_id,
                count: parseInt(row.count, 10),
            })),
        };
    }
    mapRowToEntry(row) {
        return {
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            action: row.action,
            actorId: row.actor_id,
            actorRole: row.actor_role,
            timestamp: row.timestamp,
            previousState: row.previous_state ? JSON.parse(row.previous_state) : undefined,
            newState: row.new_state ? JSON.parse(row.new_state) : undefined,
            metadata: JSON.parse(row.metadata),
        };
    }
}
exports.AuditService = AuditService;
