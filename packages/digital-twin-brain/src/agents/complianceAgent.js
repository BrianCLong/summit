"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceAgent = void 0;
class ComplianceAgent {
    constraints;
    constructor(constraints) {
        this.constraints = constraints;
    }
    evaluate(proposal) {
        const violations = this.constraints.filter((constraint) => !constraint.predicate(proposal));
        return {
            proposalId: proposal.id,
            passed: violations.length === 0,
            violations,
        };
    }
}
exports.ComplianceAgent = ComplianceAgent;
