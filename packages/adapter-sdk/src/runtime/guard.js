"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePolicy = enforcePolicy;
async function enforcePolicy(lifecycle, request, evaluator) {
    const decision = await evaluator(lifecycle, request);
    if (decision.decision === 'deny') {
        const reason = decision.reason ?? 'policy denied execution';
        throw new Error(`Adapter policy violation: ${reason}`);
    }
    return decision;
}
