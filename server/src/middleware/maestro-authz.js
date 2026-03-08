"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maestroAuthzMiddleware = maestroAuthzMiddleware;
const crypto_1 = require("crypto");
const opa_integration_js_1 = require("../conductor/governance/opa-integration.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
function maestroAuthzMiddleware(options = {}) {
    return async (req, res, next) => {
        const requestContext = req.context ||
            buildRequestContext(req);
        req.context = requestContext;
        req.correlationId = requestContext.correlationId;
        req.traceId = requestContext.traceId;
        const action = (req.method || 'unknown').toLowerCase();
        const resource = options.resource || inferResource(req);
        const policyContext = {
            tenantId: requestContext.tenantId,
            userId: req.user?.id || requestContext?.principal?.id,
            role: req.user?.role || requestContext?.principal?.role || 'user',
            action,
            resource,
            resourceAttributes: {
                ...req.body,
                ...req.params,
                ...req.query,
            },
            subjectAttributes: req.user?.attributes || {},
            sessionContext: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: Date.now(),
                sessionId: req.sessionID,
                traceId: requestContext.traceId,
            },
        };
        const decisionLog = {
            traceId: requestContext.traceId,
            correlationId: requestContext.correlationId,
            tenantId: requestContext.tenantId,
            principalId: req.user?.id ||
                req.user?.sub ||
                requestContext?.principal?.id,
            principalRole: req.user?.role || requestContext?.principal?.role,
            resource,
            action,
            resourceAttributes: policyContext.resourceAttributes,
        };
        try {
            const decision = await opa_integration_js_1.opaPolicyEngine.evaluatePolicy('maestro/authz', policyContext);
            if (!decision.allow) {
                logger_js_1.default.warn('Maestro authorization denied by OPA', {
                    ...decisionLog,
                    decision: 'deny',
                    reason: decision.reason,
                    policyBundleVersion: decision.policyBundleVersion,
                    attrsUsed: decision.attrsUsed,
                });
                return res.status(403).json({
                    error: 'Forbidden',
                    message: decision.reason || 'Access denied by policy',
                    auditContext: decision.auditLog,
                });
            }
            req.policyDecision = decision;
            logger_js_1.default.info('Maestro authorization allowed by OPA', {
                ...decisionLog,
                decision: 'allow',
                reason: decision.reason,
                policyBundleVersion: decision.policyBundleVersion,
                attrsUsed: decision.attrsUsed,
            });
            return next();
        }
        catch (error) {
            // FAIL-CLOSED: On any policy evaluation error, deny the request
            // This prevents authorization bypass if OPA is unreachable
            const isProduction = process.env.NODE_ENV === 'production';
            logger_js_1.default.error('Error evaluating Maestro authorization policy - FAIL-CLOSED', {
                ...decisionLog,
                error: error?.message || 'Unknown error',
                failClosed: true,
                environment: process.env.NODE_ENV,
            });
            if (isProduction) {
                // Production: Always deny on policy evaluation failure
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Authorization service unavailable - access denied',
                    failClosed: true,
                });
            }
            else {
                // Non-production: Allow with warning for development convenience
                logger_js_1.default.warn('Non-production: allowing request despite policy error (WOULD BE DENIED IN PRODUCTION)', {
                    ...decisionLog,
                });
                return next();
            }
        }
    };
}
function inferResource(req) {
    const path = `${req.baseUrl || ''}${req.path || ''}`;
    const segments = path.split('/').filter(Boolean);
    const maestroIndex = segments.findIndex((segment) => segment === 'maestro');
    if (maestroIndex >= 0 && segments[maestroIndex + 1]) {
        return segments[maestroIndex + 1];
    }
    return segments[segments.length - 1] || 'unknown';
}
function buildRequestContext(req) {
    const correlationId = req.correlationId || (0, crypto_1.randomUUID)();
    const principalId = req.user?.id || req.user?.sub;
    return {
        correlationId,
        tenantId: req.tenantId ||
            req.tenant_id ||
            req.user?.tenant_id ||
            req.user?.tenantId ||
            req.headers['x-tenant-id'],
        principal: {
            id: principalId,
            role: req.user?.role,
            orgId: req.user?.orgId,
        },
        traceId: req.traceId ||
            correlationId ||
            req.headers['x-trace-id'],
        requestId: req.requestId || req.correlationId,
    };
}
