"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeLatency = maybeLatency;
function maybeLatency(req, _res, next) {
    if (process.env.CHAOS_LATENCY_MS) {
        const d = Number(process.env.CHAOS_LATENCY_MS);
        setTimeout(next, d);
        return;
    }
    next();
}
