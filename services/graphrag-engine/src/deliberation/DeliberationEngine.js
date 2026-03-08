"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliberationEngine = void 0;
const RobustnessScorer_js_1 = require("./RobustnessScorer.js");
class DeliberationEngine {
    static deliberate(candidates) {
        if (candidates.length === 0) {
            throw new Error('No candidate explanations to deliberate');
        }
        const scored = candidates.map(c => ({
            ...c,
            robustness: RobustnessScorer_js_1.RobustnessScorer.score(c.explanation, c.proof)
        }));
        // Sort by robustness score descending
        scored.sort((a, b) => b.robustness.score - a.robustness.score);
        const winner = scored[0];
        const rejected = scored.slice(1).map(s => ({
            explanation: s.explanation,
            reason: `Lower robustness score: ${s.robustness.score.toFixed(2)} vs ${winner.robustness.score.toFixed(2)}`
        }));
        return {
            selectedExplanation: winner.explanation,
            selectedProof: winner.proof,
            robustness: winner.robustness,
            rejectedExplanations: rejected
        };
    }
}
exports.DeliberationEngine = DeliberationEngine;
