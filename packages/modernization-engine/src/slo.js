"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSlo = evaluateSlo;
function evaluateSlo(domain, input) {
    const availability = input.totalRequests === 0 ? 1 : 1 - input.failedRequests / input.totalRequests;
    const availabilityMet = availability >= domain.slo.availability;
    const latencyMet = input.p95LatencyMs <= domain.slo.latencyP95Ms;
    const errorBudgetBurned = Math.max(0, (domain.slo.availability - availability) * input.windowMinutes * 60);
    const errorBudgetRemainingMinutes = Math.max(domain.slo.errorBudgetMinutes - errorBudgetBurned / 60, 0);
    return {
        domain: domain.name,
        availabilityMet,
        latencyMet,
        errorBudgetRemainingMinutes,
    };
}
