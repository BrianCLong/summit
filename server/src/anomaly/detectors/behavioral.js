"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralDetector = void 0;
const types_js_1 = require("../types.js");
class BehavioralDetector {
    type = types_js_1.AnomalyType.BEHAVIORAL;
    async detect(context) {
        const data = context.data;
        const { sequence, expectedPattern } = data;
        if (!sequence || sequence.length < 2) {
            return this.createResult(context, false, 0, types_js_1.Severity.LOW);
        }
        // Simple sequence analysis: transition probability
        // For MVP, we can just check if the sequence contains forbidden patterns or deviates from expected
        // Example: Check for rapid state changes (A -> B -> A -> B) which might indicate flapping
        const flapping = this.detectFlapping(sequence);
        if (flapping) {
            return this.createResult(context, true, 0.8, types_js_1.Severity.MEDIUM, {
                description: 'Behavioral anomaly: Rapid state flapping detected',
                contributingFactors: [{ factor: 'flapping_sequence', weight: 0.8, value: sequence.slice(-5).join('->') }]
            });
        }
        // If expected pattern is provided (simplified as exact match of last N for now)
        if (expectedPattern && expectedPattern.length > 0) {
            const lastN = sequence.slice(-expectedPattern.length);
            const match = lastN.every((val, idx) => val === expectedPattern[idx]);
            if (!match) {
                // This is a weak check, just illustrative
            }
        }
        return this.createResult(context, false, 0, types_js_1.Severity.LOW);
    }
    detectFlapping(sequence) {
        if (sequence.length < 4)
            return false;
        const last4 = sequence.slice(-4);
        // A B A B pattern
        return last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1];
    }
    createResult(context, isAnomaly, score, severity, explanation) {
        return {
            isAnomaly,
            score,
            severity,
            type: this.type,
            entityId: context.entityId,
            timestamp: context.timestamp,
            explanation,
        };
    }
}
exports.BehavioralDetector = BehavioralDetector;
