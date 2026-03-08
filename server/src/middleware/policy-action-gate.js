"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPolicyContextFromRequest = buildPolicyContextFromRequest;
exports.evaluatePolicyAction = evaluatePolicyAction;
exports.policyActionGate = policyActionGate;
const crypto_1 = require("crypto");
const opa_integration_js_1 = require("../conductor/governance/opa-integration.js");
function buildPolicyContextFromRequest(req, action, resource, options = {}) {
    const user = req.user || {};
    const tenantId = user.tenantId ||
        user.tenant_id ||
        req.headers['x-tenant-id'] ||
        'unknown';
    return {
        tenantId,
        userId: user.id || user.sub || user.email,
        role: user.role || 'user',
        action,
        resource,
        resourceAttributes: options.resourceAttributes,
        subjectAttributes: user.attributes || {},
        sessionContext: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: Date.now(),
            sessionId: req.sessionID,
            traceId: req.traceId || (0, crypto_1.randomUUID)(),
        },
        policyVersion: options.policyVersion,
    };
}
async function evaluatePolicyAction(input, policyName = 'maestro/authz') {
    const context = {
        tenantId: input.tenantId,
        userId: input.userId,
        role: input.role || 'user',
        action: input.action,
        resource: input.resource,
        resourceAttributes: input.resourceAttributes,
        subjectAttributes: input.subjectAttributes || {},
        sessionContext: input.sessionContext || {
            timestamp: Date.now(),
        },
        policyVersion: input.policyVersion,
    };
    return opa_integration_js_1.opaPolicyEngine.evaluatePolicy(policyName, context);
}
function policyActionGate(options) {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const resourceAttributes = {
            ...(options.buildResourceAttributes ? options.buildResourceAttributes(req) : {}),
            resourceId: options.resolveResourceId?.(req),
        };
        const context = buildPolicyContextFromRequest(req, options.action, options.resource, { resourceAttributes });
        try {
            const decision = await opa_integration_js_1.opaPolicyEngine.evaluatePolicy(options.policyName || 'maestro/authz', context);
            if (!decision.allow) {
                return res.status(403).json({
                    error: 'Forbidden',
                    reason: decision.reason,
                    decision,
                });
            }
            req.policyDecision = decision;
            return next();
        }
        catch (error) {
            return res.status(500).json({
                error: 'Policy evaluation failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };
}
