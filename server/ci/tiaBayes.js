"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.failProb = failProb;
exports.pickTests = pickTests;
function failProb(features, w, bias = -2.0) {
    const z = features.reduce((s, x, i) => s + w[i] * x, bias);
    return 1 / (1 + Math.exp(-z));
}
function pickTests(tests, w, targetRisk = 0.02) {
    let cumRisk = 0;
    const out = [];
    const scored = tests
        .map((t) => ({ id: t.id, p: failProb(t.f, w) }))
        .sort((a, b) => b.p - a.p);
    for (const t of scored) {
        out.push(t.id);
        cumRisk += t.p * (1 - cumRisk);
        if (cumRisk >= targetRisk)
            break;
    }
    return out;
}
