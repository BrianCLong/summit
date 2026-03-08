"use strict";
/**
 * Population-Level Belief System Modeling
 *
 * Models aggregate belief distributions and dynamics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopulationBeliefTracker = void 0;
/**
 * Population Belief Tracker
 */
class PopulationBeliefTracker {
    history = new Map();
    trackBelief(topic, state) {
        const history = this.history.get(topic) || [];
        history.push(state);
        this.history.set(topic, history);
    }
    calculatePolarizationTrend(topic, windowSize) {
        const history = this.history.get(topic) || [];
        if (history.length < windowSize) {
            return { trend: 'INSUFFICIENT_DATA', slope: 0, confidence: 0 };
        }
        const recent = history.slice(-windowSize);
        const polarizationValues = recent.map((s) => s.polarization.ideological);
        // Linear regression for trend
        const slope = this.calculateSlope(polarizationValues);
        return {
            trend: slope > 0.01 ? 'INCREASING' : slope < -0.01 ? 'DECREASING' : 'STABLE',
            slope,
            confidence: this.calculateConfidence(polarizationValues, slope),
        };
    }
    calculateSlope(values) {
        const n = values.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumXX += i * i;
        }
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }
    calculateConfidence(values, slope) {
        // R² approximation
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const ssTotal = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
        const predictions = values.map((_, i) => mean + slope * (i - (n - 1) / 2));
        const ssRes = values.reduce((sum, v, i) => sum + (v - predictions[i]) ** 2, 0);
        return ssTotal > 0 ? 1 - ssRes / ssTotal : 0;
    }
}
exports.PopulationBeliefTracker = PopulationBeliefTracker;
