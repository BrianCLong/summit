"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateEstimator = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'StateEstimator' });
/**
 * Quantum-inspired State Estimator
 * Uses ensemble methods and Bayesian inference for state estimation
 */
class StateEstimator {
    priorWeight = 0.3;
    observationWeight = 0.7;
    /**
     * Estimate the new state given observations
     * Uses Kalman-like filtering with confidence weighting
     */
    async estimate(twin, observations, observationConfidence) {
        const prior = twin.currentStateVector;
        const priorConfidence = prior.confidence;
        // Bayesian confidence update
        const combinedConfidence = this.bayesianConfidenceUpdate(priorConfidence, observationConfidence);
        // Merge state properties with confidence weighting
        const mergedProperties = this.mergeProperties(prior.properties, observations, priorConfidence, observationConfidence);
        // Derive computed properties
        const derived = await this.computeDerivedProperties(mergedProperties, twin);
        // Anomaly detection
        const anomalies = this.detectAnomalies(prior.properties, mergedProperties);
        if (anomalies.length > 0) {
            logger.warn({ twinId: twin.metadata.id, anomalies }, 'State anomalies detected');
        }
        return {
            properties: mergedProperties,
            derived,
            confidence: combinedConfidence,
        };
    }
    bayesianConfidenceUpdate(priorConfidence, observationConfidence) {
        // Simplified Bayesian update
        const combined = (priorConfidence * this.priorWeight +
            observationConfidence * this.observationWeight) /
            (this.priorWeight + this.observationWeight);
        // Apply decay for uncertainty
        return Math.min(1, combined * 0.98 + 0.02);
    }
    mergeProperties(prior, observations, priorConf, obsConf) {
        const result = { ...prior };
        const totalWeight = priorConf * this.priorWeight + obsConf * this.observationWeight;
        for (const [key, value] of Object.entries(observations)) {
            const priorValue = prior[key];
            if (typeof value === 'number' && typeof priorValue === 'number') {
                // Weighted average for numeric values
                result[key] =
                    (priorValue * priorConf * this.priorWeight +
                        value * obsConf * this.observationWeight) /
                        totalWeight;
            }
            else {
                // For non-numeric, prefer observation if confidence is higher
                result[key] = obsConf >= priorConf ? value : priorValue;
            }
        }
        return result;
    }
    async computeDerivedProperties(properties, twin) {
        const derived = {};
        // Compute velocity/rate of change for numeric properties
        if (twin.stateHistory.length > 0) {
            const lastState = twin.stateHistory[twin.stateHistory.length - 1];
            const timeDelta = (Date.now() - new Date(lastState.timestamp).getTime()) / 1000;
            if (timeDelta > 0) {
                for (const [key, value] of Object.entries(properties)) {
                    const lastValue = lastState.properties[key];
                    if (typeof value === 'number' && typeof lastValue === 'number') {
                        derived[`${key}_velocity`] = (value - lastValue) / timeDelta;
                    }
                }
            }
        }
        // Compute aggregate metrics
        derived['_stateAge'] = twin.stateHistory.length;
        derived['_lastUpdateDelta'] =
            Date.now() - new Date(twin.currentStateVector.timestamp).getTime();
        return derived;
    }
    detectAnomalies(prior, current) {
        const anomalies = [];
        const threshold = 0.5; // 50% change threshold
        for (const [key, value] of Object.entries(current)) {
            const priorValue = prior[key];
            if (typeof value === 'number' && typeof priorValue === 'number' && priorValue !== 0) {
                const changeRatio = Math.abs(value - priorValue) / Math.abs(priorValue);
                if (changeRatio > threshold) {
                    anomalies.push(`${key}: ${(changeRatio * 100).toFixed(1)}% change`);
                }
            }
        }
        return anomalies;
    }
}
exports.StateEstimator = StateEstimator;
