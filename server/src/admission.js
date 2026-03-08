"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskScore = riskScore;
exports.admissionDecision = admissionDecision;
function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
}
function riskScore(r) {
    let s = 0;
    if (!r.residencyOk)
        s += 0.5;
    s += clamp(r.simulator.deny * 0.6 + r.simulator.requireHuman * 0.3, 0, 1);
    s += r.quotas?.over ? 0.2 : 0;
    s += r.dp?.exhausted ? 0.2 : 0;
    return Math.min(1, s);
}
function admissionDecision(score, t) {
    if (score >= t.deny)
        return {
            action: 'deny',
            reason: `risk=${score.toFixed(2)} >= ${t.deny}`,
        };
    if (score >= t.requireHuman)
        return {
            action: 'require-human',
            reason: `risk=${score.toFixed(2)}`,
        };
    if (score >= t.warn)
        return { action: 'warn', reason: `risk=${score.toFixed(2)}` };
    return { action: 'allow' };
}
