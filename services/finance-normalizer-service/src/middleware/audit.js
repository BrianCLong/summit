"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
exports.auditMiddleware = auditMiddleware;
const logger_js_1 = require("../utils/logger.js");
const db_js_1 = require("../utils/db.js");
const uuid_1 = require("uuid");
/**
 * Log an audit entry for financial operations
 */
async function logAudit(tenantId, userId, action, resourceType, resourceId, details, ipAddress, userAgent) {
    const entry = {
        id: (0, uuid_1.v4)(),
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        timestamp: new Date().toISOString(),
    };
    try {
        await db_js_1.db.query(`INSERT INTO finance_audit_log (
        id, tenant_id, user_id, action, resource_type, resource_id,
        details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            entry.id,
            entry.tenantId,
            entry.userId,
            entry.action,
            entry.resourceType,
            entry.resourceId,
            JSON.stringify(entry.details),
            entry.ipAddress,
            entry.userAgent,
            entry.timestamp,
        ]);
    }
    catch (error) {
        // Log but don't fail the request if audit logging fails
        logger_js_1.logger.error('Failed to write audit log', {
            error: error instanceof Error ? error.message : 'Unknown',
            entry,
        });
    }
}
/**
 * Middleware to automatically audit API operations
 */
function auditMiddleware(action, resourceType) {
    return async (req, _res, next) => {
        const resourceId = req.params.id || null;
        await logAudit(req.tenantId, req.userId || null, action, resourceType, resourceId, {
            method: req.method,
            path: req.path,
            query: req.query,
            bodyKeys: Object.keys(req.body || {}),
        }, req.ip, req.get('user-agent'));
        next();
    };
}
