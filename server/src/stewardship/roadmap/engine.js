"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoadmapEngine = void 0;
const types_js_1 = require("../drift/types.js");
const types_js_2 = require("../forecast/types.js");
const types_js_3 = require("./types.js");
class RoadmapEngine {
    generateSignals(driftSignals, forecasts) {
        const signals = [];
        // Check for Cost Efficiency Pressure
        const costDrift = driftSignals.filter((d) => d.type === types_js_1.DriftType.COST && d.severity === types_js_1.DriftSeverity.HIGH);
        const costForecast = forecasts.find((f) => f.type === types_js_2.ForecastType.COST_GROWTH);
        if (costDrift.length > 0 || (costForecast && costForecast.predictedValue > 5500)) {
            signals.push({
                category: types_js_3.PressureCategory.COST_EFFICIENCY,
                score: 85,
                reason: 'Accelerating burn rate and projected budget overrun.',
                supportingEvidence: {
                    driftSignals: costDrift,
                    forecasts: costForecast ? [costForecast] : [],
                },
                suggestedInvestmentArea: 'FinOps & Resource Optimization',
            });
        }
        // Check for Governance Debt
        const agentDrift = driftSignals.filter((d) => d.type === types_js_1.DriftType.AGENT && d.metric === 'policy_override_rate');
        const govForecast = forecasts.find((f) => f.type === types_js_2.ForecastType.GOVERNANCE_PRESSURE);
        if (agentDrift.length > 0 || (govForecast && govForecast.predictedValue > 40)) {
            signals.push({
                category: types_js_3.PressureCategory.GOVERNANCE_DEBT,
                score: 70,
                reason: 'High frequency of policy overrides indicates friction.',
                supportingEvidence: {
                    driftSignals: agentDrift,
                    forecasts: govForecast ? [govForecast] : [],
                },
                suggestedInvestmentArea: 'Policy Refinement & Workflow flexibility',
            });
        }
        return signals.sort((a, b) => b.score - a.score);
    }
}
exports.RoadmapEngine = RoadmapEngine;
