"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnforcementHooks = createEnforcementHooks;
function createEnforcementHooks(card) {
    const allowed = new Set(card.enforcement.allowedPurposes.map((purpose) => purpose.toLowerCase()));
    const denied = new Set(card.enforcement.deniedPurposes.map((purpose) => purpose.toLowerCase()));
    const denyIfOutOfScope = (context) => {
        const normalizedPurpose = context.purpose.toLowerCase();
        if (denied.has(normalizedPurpose)) {
            throw new Error(`Invocation rejected: "${context.purpose}" is explicitly out-of-scope for model ${card.metadata.modelId}.`);
        }
        if (!allowed.has(normalizedPurpose)) {
            throw new Error(`Invocation rejected: purpose "${context.purpose}" is not covered by intended use declarations.`);
        }
    };
    return { denyIfOutOfScope };
}
