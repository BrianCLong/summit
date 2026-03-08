"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineLearner = void 0;
class OnlineLearner {
    featureStore;
    constructor(featureStore) {
        this.featureStore = featureStore;
    }
    detectDrift(assetId, modality, threshold = 0.25) {
        const recent = this.featureStore.window(assetId, modality, 10);
        if (recent.length < 5)
            return null;
        const mean = this.featureStore.aggregateMean(assetId, modality, 10);
        const latest = recent[0]?.features ?? {};
        const magnitude = this.calculateShift(mean, latest);
        if (magnitude <= threshold)
            return null;
        return {
            assetId,
            modality,
            driftMagnitude: magnitude,
            reason: `Detected ${(magnitude * 100).toFixed(1)}% distribution shift across tracked features`,
        };
    }
    calculateShift(reference, candidate) {
        const keys = new Set([...Object.keys(reference), ...Object.keys(candidate)]);
        const deltas = [];
        keys.forEach((key) => {
            const base = reference[key] ?? 0;
            const value = candidate[key] ?? 0;
            const denom = Math.abs(base) + 1e-6;
            deltas.push(Math.abs(value - base) / denom);
        });
        const meanDelta = deltas.reduce((sum, d) => sum + d, 0) / (deltas.length || 1);
        return meanDelta;
    }
}
exports.OnlineLearner = OnlineLearner;
