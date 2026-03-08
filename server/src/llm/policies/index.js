"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatencyPolicy = exports.CostControlPolicy = void 0;
class CostControlPolicy {
    maxCostPerRequest;
    name = 'cost-control';
    constructor(maxCostPerRequest = 0.05) {
        this.maxCostPerRequest = maxCostPerRequest;
    }
    async sortProviders(providers, request) {
        // 1. Filter expensive providers
        const allowed = providers.filter(p => {
            const cost = p.estimateCost(request);
            return cost <= (request.budget?.maxCost || this.maxCostPerRequest);
        });
        // 2. Sort by cost (cheapest first)
        return allowed.sort((a, b) => a.estimateCost(request) - b.estimateCost(request));
    }
}
exports.CostControlPolicy = CostControlPolicy;
class LatencyPolicy {
    name = 'latency-optimization';
    async sortProviders(providers, request) {
        // Sort by estimated latency
        return [...providers].sort((a, b) => {
            const capA = a.getCapabilities().find(c => c.name === request.model) || a.getCapabilities()[0];
            const capB = b.getCapabilities().find(c => c.name === request.model) || b.getCapabilities()[0];
            return (capA.avgLatencyMs || 1000) - (capB.avgLatencyMs || 1000);
        });
    }
}
exports.LatencyPolicy = LatencyPolicy;
