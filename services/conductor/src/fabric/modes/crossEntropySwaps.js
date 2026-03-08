"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossEntropySwap = crossEntropySwap;
function crossEntropySwap(a, b) {
    const distA = normalize(a.criticScores);
    const distB = normalize(b.criticScores);
    const crossAB = crossEntropy(distA, distB);
    const crossBA = crossEntropy(distB, distA);
    if (crossAB <= crossBA) {
        return { winner: a, loser: b, crossEntropy: crossAB };
    }
    return { winner: b, loser: a, crossEntropy: crossBA };
}
function normalize(scores) {
    const exp = scores.map((s) => Math.exp(s));
    const sum = exp.reduce((acc, val) => acc + val, 0) || 1;
    return exp.map((val) => val / sum);
}
function crossEntropy(p, q) {
    let sum = 0;
    for (let i = 0; i < p.length; i += 1) {
        const qi = q[i] ?? 1e-6;
        sum += -p[i] * Math.log(qi);
    }
    return sum;
}
