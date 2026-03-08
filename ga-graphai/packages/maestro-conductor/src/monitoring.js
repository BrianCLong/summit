"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
class HealthMonitor {
    historyWindow;
    snapshots = new Map();
    history = new Map();
    constructor(historyWindow = 50) {
        this.historyWindow = historyWindow;
    }
    ingest(signal) {
        const existing = this.snapshots.get(signal.assetId);
        const metrics = existing ? { ...existing.metrics } : {};
        metrics[signal.metric] = signal.value;
        const annotations = existing ? [...existing.annotations] : [];
        if (signal.unit) {
            annotations.push(`unit:${signal.metric}:${signal.unit}`);
        }
        const snapshot = {
            assetId: signal.assetId,
            lastUpdated: signal.timestamp,
            metrics,
            annotations: [...new Set(annotations)],
        };
        this.snapshots.set(signal.assetId, snapshot);
        this.pushHistory(signal.assetId, signal.metric, signal.value);
        return snapshot;
    }
    getSnapshot(assetId) {
        return this.snapshots.get(assetId);
    }
    listSnapshots() {
        return [...this.snapshots.values()].sort((a, b) => a.assetId.localeCompare(b.assetId));
    }
    getHistory(assetId, metric) {
        const byMetric = this.history.get(assetId);
        if (!byMetric) {
            return [];
        }
        return [...(byMetric.get(metric) ?? [])];
    }
    pushHistory(assetId, metric, value) {
        const byMetric = this.history.get(assetId) ?? new Map();
        const series = byMetric.get(metric) ?? [];
        series.push(value);
        if (series.length > this.historyWindow) {
            series.shift();
        }
        byMetric.set(metric, series);
        this.history.set(assetId, byMetric);
    }
}
exports.HealthMonitor = HealthMonitor;
