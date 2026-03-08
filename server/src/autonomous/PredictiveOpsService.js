"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveOpsService = exports.SignalConfidence = void 0;
const capacity_js_1 = require("../ops/capacity.js");
var SignalConfidence;
(function (SignalConfidence) {
    SignalConfidence["INFORM"] = "inform";
    SignalConfidence["SUGGEST"] = "suggest";
    SignalConfidence["PREPARE"] = "prepare";
})(SignalConfidence || (exports.SignalConfidence = SignalConfidence = {}));
class PredictiveOpsService {
    predictiveService;
    logger;
    constructor(predictiveService, logger) {
        this.predictiveService = predictiveService;
        this.logger = logger;
    }
    /**
     * Checks for predictive signals for a given tenant
     */
    async checkSignals(tenantId) {
        const signals = [];
        try {
            // 1. Check Capacity Saturation
            const capacitySignal = await this.checkCapacitySaturation(tenantId);
            if (capacitySignal)
                signals.push(capacitySignal);
            // 2. Check Error Rate Inflection
            const errorSignal = await this.checkErrorRateInflection(tenantId);
            if (errorSignal)
                signals.push(errorSignal);
            // 3. Check Approval Queue Backlog
            // TODO: Implement queue backlog check once ApprovalService is ready
        }
        catch (error) {
            this.logger.error({ tenantId, error }, 'Failed to check predictive signals');
        }
        return signals;
    }
    async checkCapacitySaturation(tenantId) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        try {
            // Get current usage
            const currentStats = await (0, capacity_js_1.rollup)(tenantId, oneHourAgo.toISOString(), now.toISOString());
            // Forecast usage for next 24 hours
            // We use 'activity' metric as a proxy for capacity usage
            const forecast = await this.predictiveService.forecastRisk({
                entityId: tenantId,
                metric: 'activity',
                horizon: 24, // 24 hours
                legalBasis: { purpose: 'Capacity planning', policyId: 'autonomous-ops-forecast' },
            });
            // Determine if saturation is likely
            // Simple logic: if any forecast point exceeds a threshold (e.g., 90% of some hypothetical max)
            // Since we don't have the max capacity here, we'll use a relative increase check
            // e.g., if forecast is 2x current usage
            const currentUsage = currentStats.usage.cpu_sec;
            const maxForecast = Math.max(...forecast.forecast.map(f => f.value));
            if (maxForecast > currentUsage * 1.5) {
                return {
                    type: 'capacity_saturation_risk',
                    confidence: SignalConfidence.PREPARE,
                    tenantId,
                    timestamp: Date.now(),
                    payload: {
                        current: currentUsage,
                        forecast: maxForecast,
                        reason: 'Projected 50% increase in CPU usage'
                    }
                };
            }
            else if (maxForecast > currentUsage * 1.2) {
                return {
                    type: 'capacity_saturation_risk',
                    confidence: SignalConfidence.SUGGEST,
                    tenantId,
                    timestamp: Date.now(),
                    payload: {
                        current: currentUsage,
                        forecast: maxForecast,
                        reason: 'Projected 20% increase in CPU usage'
                    }
                };
            }
        }
        catch (error) {
            this.logger.warn({ tenantId, error }, 'Error checking capacity saturation');
        }
        return null;
    }
    async checkErrorRateInflection(tenantId) {
        // Mock implementation for error rate inflection
        // In a real scenario, this would query Prometheus or logs
        // 10% chance of detecting an inflection for demo purposes
        if (Math.random() > 0.9) {
            return {
                type: 'error_rate_inflection',
                confidence: SignalConfidence.INFORM,
                tenantId,
                timestamp: Date.now(),
                payload: {
                    reason: 'Slight deviation in error baseline detected'
                }
            };
        }
        return null;
    }
}
exports.PredictiveOpsService = PredictiveOpsService;
