"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceAction = enforceAction;
function enforceAction(policyHash, action, enabled = false) {
    const evidenceId = process.env.EVIDENCE_ID ?? `EVID-POLICY-${new Date().toISOString().split('T')[0]}-runtime`;
    if (!enabled) {
        return { allow: true, reason: "POLICY_DISABLED", evidenceId };
    }
    // Deny by default if enabled
    return { allow: false, reason: `DENY_DEFAULT:${action}`, evidenceId };
}
