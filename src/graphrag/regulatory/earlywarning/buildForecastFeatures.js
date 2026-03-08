"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildForecastFeatures = buildForecastFeatures;
function buildForecastFeatures(input) {
    const complaintVelocity = input.priorComplaintVolume === 0
        ? input.complaintVolume
        : (input.complaintVolume - input.priorComplaintVolume) / input.priorComplaintVolume;
    return {
        institutionId: input.institutionId,
        regulator: 'CFPB',
        product: null,
        issue: 'UNKNOWN',
        harm: null,
        periodStart: '',
        periodEnd: '',
        complaintVolume: input.complaintVolume,
        complaintVelocity,
        harmSeverityScore: input.harmSeverityScore,
        narrativeConvergenceScore: input.narrativeConvergenceScore,
        crossSourceCorrelationScore: input.crossSourceCorrelationScore,
        enforcementRiskScore: 0,
        leadTimeDaysPredicted: null
    };
}
