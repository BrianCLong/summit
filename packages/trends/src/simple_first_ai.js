"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSimpleFirst = selectSimpleFirst;
function selectSimpleFirst(cands) {
    if (process.env.FF_SIMPLE_FIRST_AI !== "1") {
        return null;
    }
    if (cands.length === 0)
        return null;
    // Simple-first: prefer low ops complexity then lowest latency
    const complexityOrder = { "low": 0, "med": 1, "high": 2 };
    const sorted = [...cands].sort((a, b) => {
        const compA = complexityOrder[a.ops_complexity];
        const compB = complexityOrder[b.ops_complexity];
        if (compA !== compB) {
            return compA - compB;
        }
        return a.latency_p95_ms - b.latency_p95_ms;
    });
    return sorted[0];
}
