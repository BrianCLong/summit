"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalDetector = void 0;
const types_js_1 = require("../types.js");
class TemporalDetector {
    type = types_js_1.AnomalyType.TEMPORAL;
    Z_SCORE_THRESHOLD = 3.0;
    async detect(context) {
        const data = context.data;
        const { value, metric, history = [] } = data;
        if (history.length < 5) {
            // Not enough data to establish a baseline
            return this.createResult(context, false, 0, types_js_1.Severity.LOW);
        }
        const { mean, std } = this.calculateStats(history);
        if (std === 0) {
            // Flatline history. Any deviation is infinite Z-score technically, but practically just check if different.
            const isDiff = value !== mean;
            return this.createResult(context, isDiff, isDiff ? 1.0 : 0.0, types_js_1.Severity.CRITICAL, isDiff ? {
                description: `Value deviated from constant baseline of ${mean}`,
                contributingFactors: [{ factor: 'deviation', weight: 1.0, value }]
            } : undefined);
        }
        const zScore = (value - mean) / std;
        const absZ = Math.abs(zScore);
        const score = Math.min(absZ / 6, 1.0); // Normalize roughly, 6 sigma as 1.0
        const isAnomaly = absZ > this.Z_SCORE_THRESHOLD;
        let severity = types_js_1.Severity.LOW;
        if (absZ > 5)
            severity = types_js_1.Severity.CRITICAL;
        else if (absZ > 4)
            severity = types_js_1.Severity.HIGH;
        else if (absZ > 3)
            severity = types_js_1.Severity.MEDIUM;
        return this.createResult(context, isAnomaly, score, severity, isAnomaly ? {
            description: `Temporal anomaly detected for ${metric} (Z-Score: ${zScore.toFixed(2)})`,
            contributingFactors: [
                { factor: 'z-score', weight: 0.8, value: zScore },
                { factor: 'value', weight: 0.2, value }
            ]
        } : undefined);
    }
    calculateStats(values) {
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        return { mean, std: Math.sqrt(variance) };
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
exports.TemporalDetector = TemporalDetector;
