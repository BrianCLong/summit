"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceEngine = void 0;
const crypto_1 = require("crypto");
class GovernanceEngine {
    redLines = new Set([
        'DISABLE_SECURITY_SCANNERS',
        'DELETE_PRODUCTION_DATA',
        'GRANT_ADMIN_ACCESS'
    ]);
    // Mock OPA client
    async checkOPA(actionType, payload) {
        // Simulate OPA policy
        if (actionType === 'RELAX_SAFETY_RULES' && !payload.approved) {
            return { allow: false, reason: 'Requires explicit human approval to relax safety.' };
        }
        return { allow: true };
    }
    async reviewPlan(plan) {
        const governedActions = [];
        for (const action of plan.actions) {
            const ga = {
                id: (0, crypto_1.randomUUID)(),
                planId: plan.id,
                actionType: action.type,
                payload: action.payload,
                status: 'APPROVED', // Optimistic default
                timestamp: new Date()
            };
            // 1. Red Line Check
            if (this.redLines.has(action.type)) {
                ga.status = 'DENIED';
                ga.denialReason = 'Red Line violation: Action is forbidden by hard-coded safety policy.';
                governedActions.push(ga);
                continue;
            }
            // 2. OPA Policy Check
            const opaResult = await this.checkOPA(action.type, action.payload);
            if (!opaResult.allow) {
                ga.status = 'DENIED';
                ga.denialReason = opaResult.reason;
                ga.policyId = 'opa-mock-policy';
            }
            governedActions.push(ga);
        }
        return governedActions;
    }
}
exports.GovernanceEngine = GovernanceEngine;
