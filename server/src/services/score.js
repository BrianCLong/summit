"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeScore = computeScore;
function computeScore(values) {
    let num = 0, den = 0;
    for (const i of values) {
        const w = i.w ?? 1;
        num += i.v * w;
        den += w;
    }
    return den === 0 ? 0 : Number((num / den).toFixed(4));
}
