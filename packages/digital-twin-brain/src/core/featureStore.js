"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureStore = void 0;
class FeatureStore {
    records = [];
    ingest(record) {
        const latestVersion = this.records
            .filter((r) => r.assetId === record.assetId && r.modality === record.modality)
            .reduce((max, r) => Math.max(max, r.version), 0);
        const nextRecord = { ...record, version: latestVersion + 1 };
        this.records.push(nextRecord);
        return nextRecord;
    }
    latest(assetId, modality) {
        return this.records
            .filter((r) => r.assetId === assetId && r.modality === modality)
            .sort((a, b) => b.version - a.version)[0];
    }
    window(assetId, modality, limit = 20) {
        return this.records
            .filter((r) => r.assetId === assetId && r.modality === modality)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    aggregateMean(assetId, modality, limit = 20) {
        const windowed = this.window(assetId, modality, limit);
        const totals = {};
        windowed.forEach((record) => {
            Object.entries(record.features).forEach(([key, value]) => {
                totals[key] = (totals[key] ?? 0) + value;
            });
        });
        const divisor = windowed.length || 1;
        Object.keys(totals).forEach((key) => {
            totals[key] = totals[key] / divisor;
        });
        return totals;
    }
}
exports.FeatureStore = FeatureStore;
