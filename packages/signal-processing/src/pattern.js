"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpectralPatternClassifier = void 0;
class SpectralPatternClassifier {
    analyzer;
    bands;
    constructor(analyzer, bands) {
        this.analyzer = analyzer;
        this.bands = bands;
    }
    classify(samples, sampleRate, signatures) {
        if (signatures.length === 0) {
            throw new Error('At least one signature is required');
        }
        const metrics = this.analyzer.analyze(samples, sampleRate, this.bands);
        const distances = {};
        signatures.forEach((signature) => {
            let distance = 0;
            this.bands.forEach((band) => {
                const observed = metrics.bandPower[band.name] ?? 0;
                const expected = signature.bandWeights[band.name] ?? 0;
                const delta = observed - expected;
                distance += delta * delta;
            });
            distances[signature.name] = Math.sqrt(distance);
        });
        const [bestLabel, bestDistance] = Object.entries(distances).reduce((best, current) => (current[1] < best[1] ? current : best), ['', Number.POSITIVE_INFINITY]);
        const maxDistance = Math.max(...Object.values(distances));
        const confidence = maxDistance === 0 ? 1 : 1 - bestDistance / (maxDistance + Number.EPSILON);
        return { label: bestLabel, confidence, distances };
    }
}
exports.SpectralPatternClassifier = SpectralPatternClassifier;
