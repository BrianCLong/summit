"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostPerformanceTracker = void 0;
class CostPerformanceTracker {
    cache = new Map();
    costs = new Map();
    recordSample(sample) {
        const existing = this.costs.get(sample.connectorId) ?? [];
        this.costs.set(sample.connectorId, [...existing, sample]);
    }
    summary(connectorId) {
        const samples = this.costs.get(connectorId) ?? [];
        const aggregate = samples.reduce((acc, sample) => {
            acc.computeMs += sample.computeMs;
            acc.apiCalls += sample.apiCalls;
            acc.storageBytes += sample.storageBytes;
            acc.egressBytes += sample.egressBytes;
            return acc;
        }, { computeMs: 0, apiCalls: 0, storageBytes: 0, egressBytes: 0 });
        return { ...aggregate, samples: samples.length };
    }
    cacheResponse(connectorId, key, value, ttlMs) {
        this.cache.set(`${connectorId}:${key}`, { value, expiresAt: Date.now() + ttlMs });
    }
    getCached(connectorId, key) {
        const entry = this.cache.get(`${connectorId}:${key}`);
        if (!entry)
            return undefined;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(`${connectorId}:${key}`);
            return undefined;
        }
        return entry.value;
    }
}
exports.CostPerformanceTracker = CostPerformanceTracker;
