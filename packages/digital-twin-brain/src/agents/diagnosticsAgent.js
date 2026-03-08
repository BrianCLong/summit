"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsAgent = void 0;
class DiagnosticsAgent {
    featureStore;
    twinGraph;
    constructor(featureStore, twinGraph) {
        this.featureStore = featureStore;
        this.twinGraph = twinGraph;
    }
    detect(assetId, modality, threshold = 0.35) {
        const latest = this.featureStore.latest(assetId, modality);
        if (!latest)
            return null;
        const mean = this.featureStore.aggregateMean(assetId, modality, 20);
        const deviation = this.relativeDeviation(mean, latest.features);
        if (deviation < threshold)
            return null;
        const neighbors = this.twinGraph.neighbors(assetId, 'depends_on');
        const factors = neighbors.map((neighbor) => `Dependency ${neighbor.id} (${neighbor.type}) may contribute.`);
        factors.unshift(`Observed ${(deviation * 100).toFixed(1)}% deviation in ${modality} signals.`);
        return { assetId, modality, score: deviation, factors };
    }
    relativeDeviation(reference, candidate) {
        const keys = new Set([...Object.keys(reference), ...Object.keys(candidate)]);
        const deltas = [];
        keys.forEach((key) => {
            const base = reference[key] ?? 0;
            const value = candidate[key] ?? 0;
            const denom = Math.abs(base) + 1e-6;
            deltas.push(Math.abs(value - base) / denom);
        });
        return deltas.reduce((sum, d) => sum + d, 0) / (deltas.length || 1);
    }
}
exports.DiagnosticsAgent = DiagnosticsAgent;
