"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcrEarlyWarningService = void 0;
const uuid_1 = require("uuid");
class FcrEarlyWarningService {
    history = new Map();
    evaluateClusters(clusters) {
        return clusters
            .map((cluster) => this.generateAlert(cluster))
            .filter((alert) => Boolean(alert));
    }
    generateAlert(cluster) {
        const previous = this.history.get(cluster.centroid_hash) ?? 0;
        this.history.set(cluster.centroid_hash, cluster.signal_count);
        const growth = cluster.signal_count - previous;
        if (growth <= 0) {
            return null;
        }
        const severity = this.severityFor(cluster, growth);
        return {
            alert_id: (0, uuid_1.v4)(),
            cluster_id: cluster.cluster_id,
            severity,
            summary: `Cluster ${cluster.centroid_hash} grew by ${growth} signals`,
            generated_at: new Date().toISOString(),
        };
    }
    severityFor(cluster, growth) {
        if (cluster.confidence > 0.85 && growth >= 10)
            return 'critical';
        if (cluster.confidence > 0.7 && growth >= 5)
            return 'high';
        if (cluster.confidence > 0.5 && growth >= 3)
            return 'medium';
        return 'low';
    }
}
exports.FcrEarlyWarningService = FcrEarlyWarningService;
