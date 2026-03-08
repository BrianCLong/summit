"use strict";
/**
 * Tenant Guard Middleware
 * Ensures tenant isolation and non-production environment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantGuard = tenantGuard;
exports.scenarioAccessGuard = scenarioAccessGuard;
const index_js_1 = require("../types/index.js");
/**
 * Extract and validate tenant from request
 */
function tenantGuard(req, res, next) {
    // Extract tenant from header or query
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    const userId = req.headers['x-user-id'] || req.query.userId || 'anonymous';
    if (!tenantId) {
        res.status(400).json({
            error: 'Tenant ID required',
            code: 'MISSING_TENANT_ID',
            message: 'X-Tenant-Id header or tenantId query parameter is required',
        });
        return;
    }
    // Validate non-production scope
    const environment = req.headers['x-environment'];
    if (environment === 'production') {
        const error = new index_js_1.ProductionDataGuardError('Scenario engine cannot operate in production environment');
        res.status(403).json({
            error: error.message,
            code: error.code,
        });
        return;
    }
    req.tenantId = tenantId;
    req.userId = userId;
    next();
}
/**
 * Validate scenario access
 */
function scenarioAccessGuard(req, res, next) {
    const tenantReq = req;
    const scenarioTenantId = req.params.tenantId || req.body?.tenantId;
    if (scenarioTenantId && scenarioTenantId !== tenantReq.tenantId) {
        res.status(403).json({
            error: 'Access denied',
            code: 'TENANT_MISMATCH',
            message: 'Cannot access scenarios from different tenant',
        });
        return;
    }
    next();
}
