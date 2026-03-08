"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTrustScore = computeTrustScore;
exports.recomputeTrustForTenant = recomputeTrustForTenant;
// @ts-nocheck
const trustRiskRepo_js_1 = require("../db/repositories/trustRiskRepo.js");
const trust_risk_metrics_js_1 = require("../observability/trust-risk-metrics.js");
function computeTrustScore(base, signals) {
    // Simple heuristic: subtract severity weights for signals in last 7 days
    const now = Date.now();
    const weekMs = 7 * 24 * 3600 * 1000;
    const weight = (sev) => ({ LOW: 0.01, MEDIUM: 0.03, HIGH: 0.08, CRITICAL: 0.15 })[sev] ||
        0.02;
    let score = base;
    for (const s of signals) {
        const age = now - new Date(s.created_at).getTime();
        if (age <= weekMs)
            score -= weight(String(s.severity).toUpperCase());
    }
    return Math.min(1, Math.max(0, parseFloat(score.toFixed(4))));
}
async function recomputeTrustForTenant(tenantId, subjectId) {
    const recents = await (0, trustRiskRepo_js_1.listRecentSignals)(tenantId, subjectId, 100);
    const score = computeTrustScore(0.7, recents);
    await (0, trustRiskRepo_js_1.upsertTrustScore)(tenantId, subjectId, score, ['auto_recompute']);
    (0, trust_risk_metrics_js_1.recordTrustScore)(subjectId, score);
}
