export class RiskEngine {
    constructor(weights, bias, version = 'v1') {
        this.weights = weights;
        this.bias = bias;
        this.version = version;
    }
    score(features, window) {
        let z = this.bias;
        const contributions = Object.keys(features).map(f => {
            const w = this.weights[f] ?? 0;
            const v = features[f] ?? 0;
            const delta = w * v;
            z += delta;
            return { feature: f, value: v, weight: w, delta };
        });
        const s = 1 / (1 + Math.exp(-z));
        const band = s < 0.33 ? 'low' : s < 0.66 ? 'medium' : s < 0.85 ? 'high' : 'critical';
        return { score: s, band, contributions, window, computedAt: new Date().toISOString(), modelVersion: this.version };
    }
}
//# sourceMappingURL=RiskEngine.js.map