"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitiveContextMiddleware = void 0;
exports.createSensitiveContextMiddleware = createSensitiveContextMiddleware;
const crypto_1 = require("crypto");
const appendOnlyAuditStore_js_1 = require("../audit/appendOnlyAuditStore.js");
const opa_integration_js_1 = require("../conductor/governance/opa-integration.js");
const DEFAULT_ROUTES = [
    '/api/security/pii',
    '/api/exports',
    '/api/analytics/export',
    '/api/intel-graph',
];
const defaultAuditStore = new appendOnlyAuditStore_js_1.AppendOnlyAuditStore();
function extractContext(req) {
    const purpose = req.headers['x-purpose'] ||
        req.body?.purpose ||
        '';
    const justification = req.headers['x-justification'] ||
        req.body?.justification ||
        '';
    const caseId = req.headers['x-case-id'] ||
        req.body?.case_id ||
        req.body?.caseId ||
        '';
    const correlationId = req.correlationId ||
        req.headers['x-correlation-id'] ||
        (0, crypto_1.randomUUID)();
    if (!purpose || !justification || !caseId) {
        return null;
    }
    return {
        purpose: purpose.trim(),
        justification: justification.trim(),
        caseId: caseId.toString().trim(),
        correlationId,
    };
}
function shouldApplyGuard(req, routes) {
    const path = `${req.baseUrl || ''}${req.path}`;
    return routes.some((prefix) => path.startsWith(prefix));
}
async function recordAudit(auditStore, req, context, decision, reason, action) {
    const tenantId = req.tenantId ||
        req.tenant_id ||
        req.user?.tenantId ||
        req.headers['x-tenant-id'] ||
        'unknown';
    const userId = req.user?.id || req.user?.sub;
    const now = new Date().toISOString();
    await auditStore.append({
        version: 'audit_event_v1',
        actor: {
            type: 'user',
            id: userId,
            ip_address: req.ip,
            name: req.user?.email,
        },
        action,
        resource: {
            type: req.method,
            name: req.path,
            id: req.params?.id,
            owner: tenantId,
        },
        classification: 'restricted',
        policy_version: process.env.OPA_POLICY_VERSION || '1.0',
        decision_id: context?.correlationId || (0, crypto_1.randomUUID)(),
        trace_id: req.traceId || context?.correlationId || (0, crypto_1.randomUUID)(),
        timestamp: now,
        customer: tenantId,
        metadata: {
            purpose: context?.purpose,
            justification: context?.justification,
            case_id: context?.caseId,
            decision,
            reason,
            correlation_id: context?.correlationId,
            tenantId,
            userId,
        },
    });
}
function createSensitiveContextMiddleware(options = {}) {
    const routes = options.routes ?? DEFAULT_ROUTES;
    const auditStore = options.auditStore ?? defaultAuditStore;
    const opaClient = options.opaClient ?? opa_integration_js_1.opaPolicyEngine;
    const action = options.action ?? 'sensitive_action';
    return async function sensitiveContextMiddleware(req, res, next) {
        if (!shouldApplyGuard(req, routes)) {
            return next();
        }
        const context = extractContext(req);
        if (!context) {
            await recordAudit(auditStore, req, null, 'deny', 'context_missing', action);
            return res.status(400).json({
                code: 'SENSITIVE_CONTEXT_REQUIRED',
                message: 'Purpose, justification, and case_id are required for sensitive operations.',
                required: ['purpose', 'justification', 'case_id'],
                guidance: 'Provide a specific case identifier, the operational purpose, and a justification before retrying.',
            });
        }
        try {
            const decisionInput = {
                tenantId: req.tenantId ||
                    req.tenant_id ||
                    req.user?.tenantId ||
                    req.headers['x-tenant-id'] ||
                    'unknown',
                userId: req.user?.id || req.user?.sub,
                role: req.user?.role || 'user',
                action: req.method.toLowerCase(),
                resource: req.path,
                resourceAttributes: {
                    ...req.body,
                    ...req.params,
                },
                context: {
                    purpose: context.purpose,
                    justification: context.justification,
                    case_id: context.caseId,
                },
            };
            const policyDecision = await opaClient.evaluatePolicy('sensitive/access', decisionInput);
            if (!policyDecision.allow) {
                await recordAudit(auditStore, req, context, 'deny', policyDecision.reason || 'policy_denied', action);
                return res.status(403).json({
                    code: 'SENSITIVE_CONTEXT_DENIED',
                    reason: policyDecision.reason || 'Access denied by policy',
                    audit: policyDecision.auditLog,
                });
            }
            req.sensitiveAccessContext = context;
            res.locals.sensitiveAccessContext = context;
            await recordAudit(auditStore, req, context, 'allow', 'policy_allowed', action);
            return next();
        }
        catch (error) {
            await recordAudit(auditStore, req, context, 'deny', 'policy_error', action);
            return res.status(500).json({
                code: 'SENSITIVE_CONTEXT_ERROR',
                message: 'Failed to evaluate sensitive access policy',
            });
        }
    };
}
exports.sensitiveContextMiddleware = createSensitiveContextMiddleware();
