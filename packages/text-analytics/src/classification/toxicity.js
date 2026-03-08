"use strict";
/**
 * Toxicity and hate speech detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToxicityDetector = void 0;
class ToxicityDetector {
    detect(text) {
        const toxicWords = ['hate', 'kill', 'stupid', 'idiot'];
        const lower = text.toLowerCase();
        let toxicityScore = 0;
        const categories = [];
        for (const word of toxicWords) {
            if (lower.includes(word)) {
                toxicityScore += 0.25;
                categories.push('offensive');
            }
        }
        return {
            isToxic: toxicityScore > 0.5,
            severity: Math.min(toxicityScore, 1.0),
            categories,
        };
    }
}
exports.ToxicityDetector = ToxicityDetector;
