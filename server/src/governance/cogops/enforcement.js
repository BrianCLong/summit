"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforce = enforce;
function enforce(action, campaign, policies) {
    const violations = [];
    for (const policy of policies) {
        if (!policy.check(action, campaign)) {
            violations.push({
                policyId: policy.id,
                policyName: policy.name,
                severity: policy.severity
            });
        }
    }
    return {
        allowed: violations.length === 0,
        violations
    };
}
