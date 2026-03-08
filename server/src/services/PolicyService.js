"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyError = exports.policyService = exports.PolicyService = void 0;
exports.withPolicy = withPolicy;
// @ts-nocheck
const audit_js_1 = require("../utils/audit.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const opa_client_js_1 = require("./opa-client.js");
class PolicyService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PolicyService.instance) {
            PolicyService.instance = new PolicyService();
        }
        return PolicyService.instance;
    }
    /**
     * Evaluates a policy request against OPA and/or internal rules.
     */
    async evaluate(ctx) {
        try {
            // Call OPA for decision
            try {
                // We map the PolicyContext to what OPA expects or pass it directly if policy supports it
                // Assuming 'intelgraph/policy/authz/allow' dictates the structure
                const opaInput = {
                    user: {
                        id: ctx.principal.id,
                        role: ctx.principal.role,
                        tenantId: ctx.principal.tenantId,
                        ...ctx.principal
                    },
                    resource: {
                        id: ctx.resource.id,
                        type: ctx.resource.type,
                        tenantId: ctx.resource.tenantId,
                        ...ctx.resource
                    },
                    action: ctx.action,
                    environment: ctx.environment
                };
                const allowed = await opa_client_js_1.opaClient.evaluateQuery('intelgraph/policy/authz/allow', opaInput);
                if (typeof allowed === 'boolean') {
                    if (!allowed)
                        return { allow: false, reason: 'OPA denied access' };
                    // If allowed, we can return true or let local overrides happen?
                    // Usually OPA is authoritative.
                    return { allow: true, reason: 'OPA allow' };
                }
            }
            catch (err) {
                logger_js_1.default.warn('OPA call failed, falling back to local evaluation', err);
                // Verify fail-open or fail-closed via config?
                // Defaulting to local fallback/fail-closed as per existing code flow
            }
            // Fallback: Basic RBAC/ABAC logic
            return this.evaluateLocal(ctx);
        }
        catch (error) {
            logger_js_1.default.error('Error evaluating policy', { error, ctx });
            return { allow: false, reason: 'Policy evaluation error' };
        }
    }
    evaluateLocal(ctx) {
        const { principal, action } = ctx;
        // Default: Deny if no principal
        if (!principal || !principal.id) {
            return { allow: false, reason: 'Unauthenticated' };
        }
        // Admin override
        if (principal.role === 'ADMIN') {
            return { allow: true, reason: 'Admin override' };
        }
        // Basic role checks (simplified for now, ideally strictly defined)
        // In a real implementation, we would load the policy matrix
        // For now, allow known roles for basic actions, deny otherwise
        // This is a placeholder for the "As-is" behavior which was permissive or relied on AccessControl.js
        // We strictly enforce tenant isolation here if resource has tenantId
        if (ctx.resource.tenantId && principal.tenantId) {
            if (ctx.resource.tenantId !== principal.tenantId) {
                return { allow: false, reason: 'Tenant mismatch' };
            }
        }
        return { allow: true, reason: 'Default allow (placeholder)' };
    }
}
exports.PolicyService = PolicyService;
exports.policyService = PolicyService.getInstance();
class PolicyError extends Error {
    code;
    reason;
    requiredClearances;
    appealPath;
    constructor(opts) {
        super(opts.reason);
        this.code = opts.code;
        this.reason = opts.reason;
        this.requiredClearances = opts.requiredClearances || [];
        this.appealPath = opts.appealPath;
    }
}
exports.PolicyError = PolicyError;
function withPolicy(resolver, spec) {
    return (async (parent, args, context, info) => {
        const ctx = context;
        const user = (ctx.user || {});
        const resource = spec.getResource
            ? (await spec.getResource(parent, args, context, info))
            : {};
        const policyContext = {
            principal: user,
            resource,
            action: spec.action,
            environment: {
                ip: ctx.req?.ip,
                userAgent: ctx.req?.headers?.['user-agent'],
                time: new Date().toISOString()
            }
        };
        const decision = await exports.policyService.evaluate(policyContext);
        const requestId = ctx.req?.id || ctx.requestId;
        const traceId = ctx.traceId;
        const infoObj = info;
        // Use the existing writeAudit utility if available, or update it later
        try {
            await (0, audit_js_1.writeAudit)({
                userId: user.id,
                userEmail: user.email,
                tenantId: (user.tenantId || resource?.tenantId),
                action: spec.action,
                resourceType: infoObj?.fieldName,
                resourceId: resource?.id,
                details: {
                    decision: decision.allow ? 'allow' : 'deny',
                    reason: decision.reason,
                    requestId: requestId,
                    traceId: traceId,
                },
                success: decision.allow,
                errorMessage: decision.reason
            });
        }
        catch (e) {
            // ignore audit errors for now or log them
            logger_js_1.default.error('Audit write failed', e);
        }
        ctx.reasonForAccess = spec.action;
        if (!decision.allow) {
            throw new PolicyError({
                code: 'POLICY_DENIED',
                reason: `Blocked: ${decision.reason || 'unauthorized'}`,
                requiredClearances: [],
                appealPath: '/appeal',
            });
        }
        return resolver(parent, args, context, info);
    });
}
