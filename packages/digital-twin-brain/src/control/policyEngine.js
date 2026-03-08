"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const uuid_1 = require("uuid");
class PolicyEngine {
    sandbox;
    config;
    constructor(sandbox, config) {
        this.sandbox = sandbox;
        this.config = config;
    }
    rankCandidates(assetId, candidatePayloads, state) {
        const baseProposals = candidatePayloads.map((payload) => ({
            id: (0, uuid_1.v4)(),
            assetId,
            description: payload.description,
            objectiveScore: 0,
            riskScore: 0,
            payload,
        }));
        return baseProposals
            .map((proposal) => {
            const outcome = this.sandbox.evaluate(proposal, state);
            const objectiveScore = this.scoreObjectives(outcome.projectedKpis);
            const riskScore = outcome.uncertainty;
            const withScores = { ...proposal, objectiveScore, riskScore };
            const violations = this.evaluateConstraints(withScores);
            return { proposal: withScores, outcome, constraintViolations: violations };
        })
            .filter(({ proposal, constraintViolations }) => proposal.riskScore <= this.config.riskTolerance || constraintViolations.length === 0)
            .sort((a, b) => b.proposal.objectiveScore - a.proposal.objectiveScore);
    }
    scoreObjectives(projectedKpis) {
        return Object.entries(this.config.objectiveWeights).reduce((score, [kpi, weight]) => {
            const value = projectedKpis[kpi] ?? 0;
            return score + value * weight;
        }, 0);
    }
    evaluateConstraints(proposal) {
        return this.config.constraints.filter((constraint) => !constraint.predicate(proposal));
    }
}
exports.PolicyEngine = PolicyEngine;
