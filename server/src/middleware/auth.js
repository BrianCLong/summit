"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.authMiddleware = void 0;
exports.ensureAuthenticated = ensureAuthenticated;
exports.requirePermission = requirePermission;
exports.ensureRole = ensureRole;
const api_1 = require("@opentelemetry/api");
const logger_js_1 = require("../config/logger.js");
const AuthService_js_1 = __importDefault(require("../services/AuthService.js"));
const advanced_audit_system_js_1 = require("../audit/advanced-audit-system.js");
const logger_js_2 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../observability/metrics.js");
const authService = new AuthService_js_1.default();
async function ensureAuthenticated(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ')
            ? auth.slice('Bearer '.length)
            : req.headers['x-access-token'] || null;
        if (!token)
            return res.status(401).json({ error: 'Unauthorized' });
        const user = await authService.verifyToken(token);
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        // Propagate user context to OpenTelemetry and Logging
        const userId = user.id || user.sub;
        if (userId) {
            const store = logger_js_1.correlationStorage.getStore();
            if (store) {
                store.set('principalId', userId);
                if (user.role)
                    store.set('role', user.role);
            }
            const span = api_1.trace.getActiveSpan();
            if (span) {
                span.setAttribute('enduser.id', userId);
                span.setAttribute('enduser.role', user.role || 'unknown');
            }
        }
        next();
    }
    catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
function requirePermission(permission) {
    return (req, res, next) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        if (authService.hasPermission(user, permission)) {
            metrics_js_1.metrics.pbacDecisionsTotal?.inc({ decision: 'allow' });
            return next();
        }
        else {
            metrics_js_1.metrics.pbacDecisionsTotal?.inc({ decision: 'deny' });
            try {
                (0, advanced_audit_system_js_1.getAuditSystem)().recordEvent({
                    eventType: 'policy_violation',
                    action: 'check_permission',
                    outcome: 'failure',
                    userId: user.id,
                    tenantId: user.tenantId || 'system',
                    serviceId: 'api-gateway',
                    resourceType: 'endpoint',
                    resourceId: req.originalUrl,
                    message: `Permission denied: ${permission}`,
                    level: 'warn',
                    details: { permission, role: user.role }
                });
            }
            catch (error) {
                if (process.env.NODE_ENV !== 'test') {
                    logger_js_2.default.error('Failed to log audit event', error);
                }
            }
            return res.status(403).json({ error: 'Forbidden' });
        }
    };
}
function ensureRole(requiredRole) {
    const roles = (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).map(r => r.toUpperCase());
    return (req, res, next) => {
        const user = req.user;
        if (!user || !user.role)
            return res.status(401).json({ error: 'Unauthorized' });
        const userRole = user.role.toUpperCase();
        if (roles.includes(userRole)) {
            return next();
        }
        else {
            return res.status(403).json({ error: 'Forbidden: Insufficient role' });
        }
    };
}
// Export aliases for compatibility
exports.authMiddleware = ensureAuthenticated;
exports.auth = ensureAuthenticated;
