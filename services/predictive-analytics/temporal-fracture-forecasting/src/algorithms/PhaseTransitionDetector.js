"use strict";
/**
 * PhaseTransitionDetector - Detects phase transitions in time series data
 *
 * Uses CUSUM (Cumulative Sum Control Chart) and Bayesian change point detection
 * to identify regime changes in system behavior.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhaseTransitionDetector = void 0;
const SystemPhase_js_1 = require("../models/SystemPhase.js");
class PhaseTransitionDetector {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Detect phase transitions in time series
     */
    detect(data) {
        if (data.length < this.config.windowSize * 2) {
            return [];
        }
        const transitions = [];
        let currentPhase = this.identifyPhase(data[0]);
        for (let i = this.config.windowSize; i < data.length; i++) {
            const window = data.slice(Math.max(0, i - this.config.windowSize), i);
            // Compute statistical moments
            const mean = this.computeMean(window);
            const variance = this.computeVariance(window, mean);
            const skewness = this.computeSkewness(window, mean, variance);
            // Detect regime change using CUSUM
            const cusumScore = this.computeCUSUM(window, mean, variance);
            if (cusumScore > this.config.threshold) {
                const newPhase = this.identifyPhase(data[i], {
                    mean,
                    variance,
                    skewness,
                    cusumScore,
                });
                if (newPhase !== currentPhase) {
                    transitions.push({
                        id: `transition-${data[i].timestamp.getTime()}`,
                        systemId: 'unknown', // Will be set by caller
                        transitionTime: data[i].timestamp,
                        fromPhase: currentPhase,
                        toPhase: newPhase,
                        confidence: this.calculateConfidence(cusumScore, variance),
                        metrics: { mean, variance, skewness, cusumScore },
                    });
                    currentPhase = newPhase;
                }
            }
        }
        return transitions;
    }
    /**
     * Identify phase based on metrics
     */
    identifyPhase(dataPoint, metrics) {
        if (!metrics) {
            return SystemPhase_js_1.PhaseState.STABLE;
        }
        // Heuristic phase classification
        const { variance, skewness, cusumScore } = metrics;
        // High variance + high CUSUM = unstable or critical
        if (variance > 0.5 && cusumScore > 0.3) {
            return skewness > 1 ? SystemPhase_js_1.PhaseState.CRITICAL : SystemPhase_js_1.PhaseState.UNSTABLE;
        }
        // Moderate variance + increasing trend = pre-fracture
        if (variance > 0.2 && cusumScore > 0.1) {
            return SystemPhase_js_1.PhaseState.PRE_FRACTURE;
        }
        // Decreasing variance = recovering
        if (cusumScore < -0.1) {
            return SystemPhase_js_1.PhaseState.RECOVERING;
        }
        return SystemPhase_js_1.PhaseState.STABLE;
    }
    /**
     * Compute CUSUM score
     */
    computeCUSUM(window, targetMean, targetVariance) {
        let cumSum = 0;
        const k = 0.5; // Slack parameter
        for (const point of window) {
            const deviation = point.value - targetMean;
            const normalized = deviation / Math.sqrt(targetVariance);
            cumSum = Math.max(0, cumSum + normalized - k);
        }
        return cumSum / window.length;
    }
    /**
     * Calculate confidence based on CUSUM score and variance
     */
    calculateConfidence(cusumScore, variance) {
        // Higher CUSUM and lower variance = higher confidence
        const cusumConfidence = Math.min(1, cusumScore / 0.5);
        const varianceConfidence = Math.max(0, 1 - variance);
        return (cusumConfidence * 0.7 + varianceConfidence * 0.3);
    }
    /**
     * Compute mean
     */
    computeMean(data) {
        if (data.length === 0)
            return 0;
        return data.reduce((sum, d) => sum + d.value, 0) / data.length;
    }
    /**
     * Compute variance
     */
    computeVariance(data, mean) {
        if (data.length === 0)
            return 0;
        const squaredDiffs = data.map((d) => Math.pow(d.value - mean, 2));
        return squaredDiffs.reduce((sum, d) => sum + d, 0) / data.length;
    }
    /**
     * Compute skewness
     */
    computeSkewness(data, mean, variance) {
        if (data.length === 0 || variance === 0)
            return 0;
        const cubedDiffs = data.map((d) => Math.pow((d.value - mean) / Math.sqrt(variance), 3));
        return cubedDiffs.reduce((sum, d) => sum + d, 0) / data.length;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.PhaseTransitionDetector = PhaseTransitionDetector;
