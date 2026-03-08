"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankOutcomes = rankOutcomes;
function rankOutcomes(report) {
    return report.outcomes
        .map((outcome) => toRankedOutcome(outcome))
        .sort((a, b) => b.risk_contribution - a.risk_contribution);
}
function toRankedOutcome(outcome) {
    const taxonomy = outcome.candidate.taxonomy ?? "passed";
    const regressionPenalty = outcome.baseline.passed && !outcome.candidate.passed ? 1.5 : 1;
    const failurePenalty = outcome.candidate.passed ? 0 : outcome.candidate.severity * regressionPenalty;
    const coveragePenalty = outcome.coverage_delta < 0 ? Math.abs(outcome.coverage_delta) * 5 : 0;
    const riskContribution = (failurePenalty + coveragePenalty) * outcome.business_impact;
    return {
        ...outcome,
        risk_contribution: Number(riskContribution.toFixed(4)),
        taxonomy,
    };
}
