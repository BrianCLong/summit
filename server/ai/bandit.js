"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleArm = sampleArm;
exports.updateArm = updateArm;
exports.route = route;
const stats = new Map();
function normReward({ evalScore, costUSD, lambda }) {
    // Normalize to [0,1] approx: eval in [0,1], cost penalty scaled
    const r = Math.max(0, Math.min(1, evalScore - lambda * costUSD));
    return r;
}
function sampleArm(arms) {
    // Thompson over Beta approximation by mapping mean/variance to pseudo counts
    let best = null;
    for (const id of arms) {
        const s = stats.get(id) || { n: 0, mean: 0.5, m2: 0.25 };
        const alpha = Math.max(1, s.mean * 20);
        const beta = Math.max(1, (1 - s.mean) * 20);
        const draw = betaSample(alpha, beta); // cheap approximation below
        if (!best || draw > best.score)
            best = { id, score: draw };
    }
    return best.id;
}
function updateArm(id, r) {
    const s = stats.get(id) || { n: 0, mean: 0, m2: 0 };
    const n1 = s.n + 1;
    const delta = r - s.mean;
    const mean = s.mean + delta / n1;
    const m2 = s.m2 + delta * (r - mean);
    stats.set(id, { n: n1, mean, m2 });
}
function betaSample(a, b) {
    // Marsaglia method via two gamma draws; here a very small approx for speed
    function gamma(k) {
        const u = Math.random();
        return -Math.log(1 - u) * k;
    }
    const x = gamma(a), y = gamma(b);
    return x / (x + y);
}
async function route(arms, ctx) {
    const pick = sampleArm(arms);
    return {
        pick,
        report: (evalScore, costUSD) => updateArm(pick, normReward({ evalScore, costUSD, lambda: ctx.lambda })),
    };
}
