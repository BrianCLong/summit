"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceSupportPolicy = enforceSupportPolicy;
const crypto_1 = require("crypto");
const AuthService_js_1 = __importDefault(require("../AuthService.js"));
const PolicyEngine_js_1 = require("../PolicyEngine.js");
const errors_js_1 = require("../../lib/errors.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const support_js_1 = require("../../policies/support.js");
async function enforceSupportPolicy(params) {
    const { actor, policy, action, resource, justification } = params;
    const decisionId = (0, crypto_1.randomUUID)();
    const authService = new AuthService_js_1.default();
    const policyEngine = PolicyEngine_js_1.PolicyEngine.getInstance();
    if (policy.requireJustification && !justification?.trim()) {
        throw new errors_js_1.AppError('Justification is required for this action.', 400, 'JUSTIFICATION_REQUIRED');
    }
    const roleAllowed = (0, support_js_1.isRoleAllowed)(actor.role, policy.allowedRoles);
    const permissionMatches = policy.requiredPermissions.filter((permission) => authService.hasPermission(actor, permission));
    const permissionAllowed = policy.requiredPermissions.length === 0 || permissionMatches.length > 0;
    const engineDecision = await policyEngine.evaluate({
        environment: process.env.NODE_ENV || 'dev',
        user: {
            id: actor.id,
            role: actor.role,
            permissions: permissionMatches,
            tenantId: actor.tenantId,
        },
        action,
        resource,
    });
    const allow = roleAllowed && permissionAllowed && engineDecision.allow;
    const reason = !roleAllowed
        ? 'Role not allowlisted'
        : !permissionAllowed
            ? 'Permission not allowlisted'
            : engineDecision.allow
                ? 'Allowed by policy'
                : engineDecision.reason || 'Policy engine denied';
    logger_js_1.default.info('Support policy evaluated', {
        actorId: actor.id,
        policyId: policy.id,
        policyDecisionId: decisionId,
        action,
        resourceType: resource.type,
        allow,
        reason,
    });
    if (!allow) {
        throw new errors_js_1.AppError(`Policy denied: ${reason}`, 403, 'POLICY_DENIED');
    }
    return {
        allow,
        reason,
        policyId: policy.id,
        policyDecisionId: decisionId,
    };
}
