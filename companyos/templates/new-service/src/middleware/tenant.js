"use strict";
/**
 * Tenant Context Middleware
 * Extracts and validates tenant context for all requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = tenantMiddleware;
exports.requireTenant = requireTenant;
const logger_js_1 = require("../utils/logger.js");
/**
 * Tenant context middleware
 */
async function tenantMiddleware(req, res, next) {
    try {
        const tenantId = req.authContext?.tenantId || req.headers['x-tenant-id'];
        if (!tenantId) {
            res.status(400).json({ error: 'Tenant context required' });
            return;
        }
        // In production, fetch tenant details from database/cache
        // For template, use simplified context
        const tenantContext = {
            tenantId,
            tier: req.headers['x-tenant-tier'] || 'STARTER',
            region: req.headers['x-tenant-region'] || 'us-east-1',
            features: {},
            quotas: {
                apiCallsPerHour: 1000,
                storageGb: 10,
            },
        };
        req.tenantContext = tenantContext;
        // Add tenant ID to all log entries
        logger_js_1.logger.setContext({ tenantId });
        next();
    }
    catch (error) {
        logger_js_1.logger.error('Tenant middleware error', { error });
        res.status(500).json({ error: 'Tenant context error' });
    }
}
/**
 * Require tenant context middleware
 */
function requireTenant() {
    return (req, res, next) => {
        if (!req.tenantContext) {
            res.status(400).json({ error: 'Tenant context required' });
            return;
        }
        next();
    };
}
