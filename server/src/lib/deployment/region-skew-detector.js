"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionSkewDetector = void 0;
class RegionSkewDetector {
    thresholdMs;
    constructor(thresholdMs = 200) {
        this.thresholdMs = thresholdMs;
    }
    /**
     * Detects latency skew between regions based on health probe results.
     */
    detectLatencySkew(statuses) {
        const healthy = statuses.filter(s => s.isHealthy);
        if (healthy.length < 2) {
            return {
                detected: false,
                maxSkewMs: 0,
                details: 'Not enough healthy regions to compare.',
            };
        }
        let minLatency = Infinity;
        let maxLatency = -Infinity;
        for (const status of healthy) {
            if (status.latencyMs < minLatency)
                minLatency = status.latencyMs;
            if (status.latencyMs > maxLatency)
                maxLatency = status.latencyMs;
        }
        const skew = maxLatency - minLatency;
        const detected = skew > this.thresholdMs;
        return {
            detected,
            maxSkewMs: skew,
            details: detected
                ? `Latency skew of ${skew}ms detected (Threshold: ${this.thresholdMs}ms).`
                : 'Latency skew within limits.',
        };
    }
    /**
     * Placeholder for data replication skew detection.
     * In a real scenario, this would compare replication lag metrics or watermarks.
     */
    detectDataSkew(replicationLags) {
        // Implementation would go here.
        return {
            detected: false,
            maxSkewMs: 0,
            details: "Not implemented"
        };
    }
}
exports.RegionSkewDetector = RegionSkewDetector;
