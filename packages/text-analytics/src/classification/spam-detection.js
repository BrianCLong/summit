"use strict";
/**
 * Spam and fraud detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpamDetector = void 0;
class SpamDetector {
    detect(text) {
        const spamIndicators = [
            'click here',
            'free money',
            'congratulations',
            'winner',
            'urgent',
            'act now',
        ];
        let spamScore = 0;
        const lower = text.toLowerCase();
        for (const indicator of spamIndicators) {
            if (lower.includes(indicator)) {
                spamScore += 0.2;
            }
        }
        return {
            isSpam: spamScore > 0.5,
            confidence: Math.min(spamScore, 1.0),
        };
    }
}
exports.SpamDetector = SpamDetector;
