"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardFromMetrics = rewardFromMetrics;
function rewardFromMetrics({ costUsd, latencyMs, qualityScore, }, weights) {
    const costNorm = 1 / (1 + Math.max(0, costUsd));
    const latNorm = 1 / (1 + Math.max(0, latencyMs) / 1000);
    const q = Math.max(0, Math.min(1, qualityScore ?? 0.8));
    const r = weights.cost * costNorm + weights.latency * latNorm + weights.quality * q;
    return Math.max(0, Math.min(1, r));
}
