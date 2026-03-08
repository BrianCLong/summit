"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCanary = evaluateCanary;
async function evaluateCanary(runId, thresholds, fetchMetrics, rollback) {
    const m = await fetchMetrics();
    if (m.errorRate * 100 > thresholds.errorRatePct ||
        m.p95 > thresholds.p95LatencyMs) {
        await rollback();
        return { rolledBack: true };
    }
    return { rolledBack: false };
}
