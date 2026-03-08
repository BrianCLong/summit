"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulate = simulate;
function simulate(baseline, patch) {
    const out = { ...baseline };
    if (patch.p95ms != null)
        out.p95ms = baseline.p95ms * (1 + patch.p95ms);
    if (patch.err != null)
        out.err = baseline.err * (1 + patch.err);
    if (patch.usd != null)
        out.usd = baseline.usd * (1 + patch.usd);
    return out;
}
