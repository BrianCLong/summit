"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicDifficultyEstimator = void 0;
const heuristics_1 = require("./heuristics");
class HeuristicDifficultyEstimator {
    async estimate(query, opts) {
        const domain = (0, heuristics_1.detectDomain)(query, opts?.contextHint);
        const features = (0, heuristics_1.extractDifficultyFeatures)(query);
        const score = (0, heuristics_1.scoreDifficultyFromFeatures)(features);
        return {
            score,
            domain,
            recommendedDepth: (0, heuristics_1.recommendedDepth)(score),
            features,
        };
    }
}
exports.HeuristicDifficultyEstimator = HeuristicDifficultyEstimator;
