"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatencyPolicy = void 0;
class LatencyPolicy {
    name = 'latency';
    selectProvider(candidates, request, config) {
        // Sort by estimated latency
        const sorted = [...candidates].sort((a, b) => {
            const estA = a.estimate(request.taskType, 100);
            const estB = b.estimate(request.taskType, 100);
            return estA.p95ms - estB.p95ms;
        });
        return sorted[0] || null;
    }
}
exports.LatencyPolicy = LatencyPolicy;
