"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateGovernancePolicy = evaluateGovernancePolicy;
const registry_js_1 = require("./registry.js");
const crypto_1 = require("crypto");
function evaluateGovernancePolicy(category, context) {
    const profile = (0, registry_js_1.getRiskProfile)(category);
    let outcome = 'DENIED';
    let reason = '';
    if (profile.allowed) {
        if (profile.color === 'yellow') {
            outcome = 'CONDITIONAL';
            reason = 'Requires human review or additional logging';
        }
        else {
            outcome = 'ALLOWED';
            reason = 'Low risk approved activity';
        }
    }
    else {
        outcome = 'DENIED';
        reason = `Category ${category} is strictly prohibited by governance policy`;
    }
    return {
        id: (0, crypto_1.randomUUID)(),
        tenantId: context.tenantId,
        timestamp: new Date(),
        outcome,
        reason,
        riskCategory: category
    };
}
