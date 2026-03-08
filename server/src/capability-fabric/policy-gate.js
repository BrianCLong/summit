"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCapabilityPolicy = evaluateCapabilityPolicy;
const opa_integration_js_1 = require("../conductor/governance/opa-integration.js");
async function evaluateCapabilityPolicy(capability, context) {
    if (!capability.policy_refs || capability.policy_refs.length === 0) {
        return { allow: false, reason: 'policy_missing' };
    }
    const policyName = capability.policy_refs[0]
        .replace('policies/', '')
        .replace('.rego', '')
        .replace(/\//g, '.');
    const decision = await opa_integration_js_1.opaPolicyEngine.evaluatePolicy(policyName, {
        tenantId: context.tenantId,
        userId: context.userId,
        role: context.role,
        action: 'capability.invoke',
        resource: capability.capability_id,
        subjectAttributes: {
            scopes: context.scopes ?? [],
            approvalToken: !!context.approvalToken,
        },
    });
    return { allow: decision.allow, reason: decision.reason };
}
