"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebalance = rebalance;
function rebalance(bins, total) {
    const w = bins.map((b) => Math.max(0, b.roi));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    return bins.map((b, i) => ({ id: b.id, alloc: total * (w[i] / sum) }));
}
