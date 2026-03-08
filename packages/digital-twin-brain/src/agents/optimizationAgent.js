"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizationAgent = void 0;
class OptimizationAgent {
    policyEngine;
    sandbox;
    constructor(policyEngine, sandbox) {
        this.policyEngine = policyEngine;
        this.sandbox = sandbox;
    }
    search(assetId, candidatePayloads, state) {
        return this.policyEngine.rankCandidates(assetId, candidatePayloads, state).map(({ proposal, constraintViolations }) => ({
            proposal,
            violations: constraintViolations,
        }));
    }
}
exports.OptimizationAgent = OptimizationAgent;
