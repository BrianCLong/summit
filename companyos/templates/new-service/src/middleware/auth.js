"use strict";
/**
 * OPA Authorization Middleware
 * Pre-wired OPA integration for the paved road template
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requirePermission = requirePermission;
const config_js_1 = require("../config.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Authentication middleware - extracts auth context from headers/token
 */
async function authMiddleware(req, res, next) {
    try {
        // Extract auth token (simplified - replace with real JWT validation)
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // In production, validate JWT and extract claims
        // For template, we'll use header-based auth for simplicity
        const userId = req.headers['x-user-id'] || 'anonymous';
        const roles = (req.headers['x-user-roles'] || '').split(',').filter(Boolean);
        const tenantId = req.headers['x-tenant-id'];
        const mfaVerified = req.headers['x-mfa-verified'] === 'true';
        req.authContext = {
            userId,
            roles,
            tenantId,
            mfaVerified,
        };
        next();
    }
    catch (error) {
        logger_js_1.logger.error('Auth middleware error', { error });
        res.status(500).json({ error: 'Authentication service error' });
    }
}
/**
 * Permission check middleware - calls OPA for authorization
 */
function requirePermission(action) {
    return async (req, res, next) => {
        const authContext = req.authContext;
        if (!authContext) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        try {
            const decision = await checkOPAPermission(authContext, action, req);
            if (!decision.allow) {
                logger_js_1.logger.warn('Permission denied', {
                    userId: authContext.userId,
                    action,
                    reason: decision.reason,
                });
                res.status(403).json({
                    error: 'Permission denied',
                    reason: decision.reason,
                });
                return;
            }
            // Check if MFA is required
            if (decision.requires_mfa && !authContext.mfaVerified) {
                res.status(403).json({
                    error: 'MFA required',
                    code: 'MFA_REQUIRED',
                });
                return;
            }
            next();
        }
        catch (error) {
            logger_js_1.logger.error('OPA check failed', { error, action });
            // Fail open in dev, closed in prod
            if (config_js_1.config.nodeEnv === 'development') {
                logger_js_1.logger.warn('OPA unavailable, failing open in development');
                next();
            }
            else {
                res.status(503).json({ error: 'Authorization service unavailable' });
            }
        }
    };
}
/**
 * Call OPA for policy decision
 */
async function checkOPAPermission(authContext, action, req) {
    const input = {
        subject: {
            id: authContext.userId,
            tenant_id: authContext.tenantId,
            roles: authContext.roles,
            mfa_verified: authContext.mfaVerified,
        },
        resource: {
            type: getResourceType(req.path),
            tenant_id: authContext.tenantId,
        },
        action,
        environment: {
            timestamp: new Date().toISOString(),
        },
    };
    const response = await fetch(`${config_js_1.config.opaUrl}/v1/data/companyos/authz/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
        throw new Error(`OPA returned ${response.status}`);
    }
    const result = await response.json();
    return result.result || { allow: false, reason: 'No policy result' };
}
function getResourceType(path) {
    const parts = path.split('/').filter(Boolean);
    return parts[1] || 'unknown';
}
