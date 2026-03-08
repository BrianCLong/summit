"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreeningQualityLoop = exports.RegionalDigitalTwin = exports.EvidenceExporter = void 0;
class EvidenceExporter {
    buildEvidencePack(events, regionId) {
        const filtered = events
            .filter((event) => event.regionId === regionId)
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const latestByType = new Map();
        for (const event of filtered) {
            latestByType.set(event.type, event);
        }
        return {
            regionId,
            exportedAt: new Date().toISOString(),
            events: Array.from(latestByType.values()).map((event) => ({
                type: event.type,
                payload: event.payload,
                timestamp: event.timestamp.toISOString(),
            })),
        };
    }
}
exports.EvidenceExporter = EvidenceExporter;
class RegionalDigitalTwin {
    simulate(scenario, residencyStrict, availabilityWeight) {
        const residencyRiskScore = residencyStrict ? 0.05 : 0.35;
        const availabilityScore = Math.min(1, 0.6 + availabilityWeight * 0.4);
        const recommendation = residencyStrict
            ? 'Maintain hard residency; use in-region failover only'
            : 'Permit controlled cross-region failover with contractual guardrails';
        return {
            scenario,
            residencyRiskScore,
            availabilityScore,
            recommendation,
        };
    }
}
exports.RegionalDigitalTwin = RegionalDigitalTwin;
class ScreeningQualityLoop {
    threshold;
    constructor(threshold) {
        this.threshold = threshold;
    }
    evaluate(falseNegatives, totalScreened) {
        const falseNegativeRate = totalScreened === 0 ? 0 : falseNegatives / totalScreened;
        const thresholdsAdjusted = falseNegativeRate > this.threshold;
        const newThreshold = thresholdsAdjusted ? Math.max(this.threshold * 0.9, 0.01) : this.threshold;
        return {
            falseNegativeRate,
            thresholdsAdjusted,
            newThreshold,
        };
    }
}
exports.ScreeningQualityLoop = ScreeningQualityLoop;
