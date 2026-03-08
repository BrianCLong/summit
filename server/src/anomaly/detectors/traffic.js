"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficDetector = void 0;
const types_js_1 = require("../types.js");
const traffic_engine_js_1 = require("../traffic-engine.js");
class TrafficDetector {
    type = types_js_1.AnomalyType.NETWORK; // Keeping it NETWORK as per user mental model, or could define TRAFFIC
    engine;
    constructor() {
        this.engine = new traffic_engine_js_1.TrafficEngine();
    }
    async detect(context) {
        const data = context.data;
        const flows = data.flows;
        if (!flows || flows.length === 0) {
            return this.createResult(context, false, 0, types_js_1.Severity.LOW);
        }
        const anomaliesMap = this.engine.detectBatchAnomalies(flows);
        // Aggregate results
        const anomalies = Array.from(anomaliesMap.values());
        const isAnomaly = anomalies.length > 0;
        if (!isAnomaly) {
            return this.createResult(context, false, 0, types_js_1.Severity.LOW);
        }
        // Determine max severity and score
        const maxScore = Math.max(...anomalies.map(a => a.score));
        let severity = types_js_1.Severity.LOW;
        if (maxScore > 0.9)
            severity = types_js_1.Severity.CRITICAL;
        else if (maxScore > 0.7)
            severity = types_js_1.Severity.HIGH;
        else if (maxScore > 0.5)
            severity = types_js_1.Severity.MEDIUM;
        // Group by type for explanation
        const counts = anomalies.reduce((acc, curr) => {
            acc[curr.type] = (acc[curr.type] || 0) + 1;
            return acc;
        }, {});
        const contributingFactors = Object.entries(counts).map(([type, count]) => ({
            factor: `${type} Detection`,
            weight: count / flows.length,
            value: `${count} flows flagged`
        }));
        return this.createResult(context, true, maxScore, severity, {
            description: `Detected ${anomalies.length} traffic anomalies`,
            contributingFactors,
            details: anomalies.slice(0, 10) // Return first 10 for detailed view
        });
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
exports.TrafficDetector = TrafficDetector;
