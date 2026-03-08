"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDegraded = withDegraded;
function withDegraded(fn, opts = {}) {
    const drop = Math.max(0, Math.min(opts.dropRate ?? 0, 1));
    const base = Math.max(0, opts.minLatencyMs ?? 0);
    const jitter = Math.max(0, opts.jitterMs ?? 0);
    return async (...args) => {
        const latency = base + Math.floor(Math.random() * jitter);
        await new Promise((r) => setTimeout(r, latency));
        if (Math.random() < drop) {
            throw Object.assign(new Error('Simulated packet drop'), {
                code: 'DEGRADED_DROP',
            });
        }
        return await fn(...args);
    };
}
