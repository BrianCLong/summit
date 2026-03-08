"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntropyAnalyzer = void 0;
class EntropyAnalyzer {
    /**
     * Calculates Shannon entropy for a set of observations.
     * High entropy suggests high variance/automation; low entropy suggests coordination.
     */
    static calculate(observations) {
        if (observations.length === 0)
            return 0;
        const counts = new Map();
        observations.forEach(obs => {
            counts.set(obs, (counts.get(obs) || 0) + 1);
        });
        let entropy = 0;
        const total = observations.length;
        counts.forEach(count => {
            const p = count / total;
            entropy -= p * Math.log2(p);
        });
        return entropy;
    }
    /**
     * Detects coordination signals based on entropy thresholds.
     */
    static detectCoordination(entropy, threshold = 0.5) {
        // Low entropy means high similarity/repetition, a signal for coordination.
        return entropy < threshold;
    }
}
exports.EntropyAnalyzer = EntropyAnalyzer;
