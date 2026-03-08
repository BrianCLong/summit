"use strict";
/**
 * Drift Detector Algorithm
 * Detects data drift, concept drift, and prediction drift
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftDetector = void 0;
const DriftMetric_js_1 = require("../models/DriftMetric.js");
class DriftDetector {
    config;
    baselineData = new Map();
    predictionHistory = [];
    constructor(config) {
        this.config = config;
    }
    /**
     * Set baseline data for drift detection
     */
    setBaseline(data) {
        this.baselineData = new Map(Object.entries(data));
    }
    /**
     * Detect drift in current data
     */
    detectDrift(currentData, predictions) {
        const startTime = Date.now();
        // Detect data drift
        const { dataDrift, affectedFeatures } = this.detectDataDrift(currentData);
        // Detect concept drift
        const conceptDrift = this.detectConceptDrift();
        // Detect prediction drift
        const predictionDrift = this.detectPredictionDrift(predictions);
        // Calculate overall PSI and KS
        const overallPSI = affectedFeatures.reduce((sum, f) => sum + f.psi, 0) / Math.max(affectedFeatures.length, 1);
        const overallKS = affectedFeatures.reduce((sum, f) => sum + f.ksStatistic, 0) / Math.max(affectedFeatures.length, 1);
        // Calculate JS divergence
        const jsDivergence = this.calculateJSDivergence(currentData);
        // Determine severity
        const severity = DriftMetric_js_1.DriftMetricCalculator.determineSeverity(overallPSI);
        // Analyze trend
        const driftTrend = DriftMetric_js_1.DriftMetricCalculator.analyzeTrend([
            overallPSI,
            dataDrift,
        ]);
        const driftVelocity = DriftMetric_js_1.DriftMetricCalculator.calculateVelocity([
            overallPSI,
            dataDrift,
        ]);
        const driftMetric = {
            dataDrift,
            conceptDrift,
            predictionDrift,
            psi: overallPSI,
            ksStatistic: overallKS,
            jsDivergence,
            severity,
            affectedFeatures,
            driftDetected: overallPSI > this.config.psiThreshold ||
                overallKS > this.config.ksThreshold,
            driftTrend,
            driftVelocity,
            estimatedImpact: DriftMetric_js_1.DriftMetricCalculator.estimateImpact(overallPSI, driftVelocity),
        };
        return {
            driftMetric,
            driftDetected: driftMetric.driftDetected,
            severity,
        };
    }
    /**
     * Detect data drift (feature distribution changes)
     */
    detectDataDrift(currentData) {
        const affectedFeatures = [];
        let totalDrift = 0;
        for (const [featureName, currentValues] of Object.entries(currentData)) {
            const baselineValues = this.baselineData.get(featureName);
            if (!baselineValues || baselineValues.length === 0) {
                continue;
            }
            // Calculate PSI
            const psi = DriftMetric_js_1.DriftMetricCalculator.calculatePSI(baselineValues, currentValues);
            // Calculate KS statistic
            const ksStatistic = DriftMetric_js_1.DriftMetricCalculator.calculateKS(baselineValues, currentValues);
            // Get statistics
            const baselineStats = DriftMetric_js_1.DriftMetricCalculator.calculateFeatureStats(baselineValues);
            const currentStats = DriftMetric_js_1.DriftMetricCalculator.calculateFeatureStats(currentValues);
            const featureDrift = {
                featureName,
                psi,
                ksStatistic,
                severity: DriftMetric_js_1.DriftMetricCalculator.determineSeverity(psi),
                baselineStats,
                currentStats,
            };
            affectedFeatures.push(featureDrift);
            totalDrift += psi;
        }
        const dataDrift = affectedFeatures.length > 0
            ? totalDrift / affectedFeatures.length
            : 0;
        return { dataDrift, affectedFeatures };
    }
    /**
     * Detect concept drift (relationship changes)
     */
    detectConceptDrift() {
        // Simplified concept drift detection
        // In production, this would analyze prediction errors over time
        // using DDM (Drift Detection Method) or ADWIN
        // Placeholder implementation
        return 0.05; // Low concept drift
    }
    /**
     * Detect prediction drift (output distribution changes)
     */
    detectPredictionDrift(predictions) {
        if (!predictions || predictions.length === 0) {
            return 0;
        }
        // Store predictions in history
        this.predictionHistory.push(predictions);
        // Keep only recent history (e.g., last 10 batches)
        if (this.predictionHistory.length > 10) {
            this.predictionHistory.shift();
        }
        if (this.predictionHistory.length < 2) {
            return 0;
        }
        // Compare current predictions to historical average
        const currentMean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
        const historicalMeans = this.predictionHistory
            .slice(0, -1)
            .map((batch) => batch.reduce((sum, p) => sum + p, 0) / batch.length);
        const historicalMean = historicalMeans.reduce((sum, m) => sum + m, 0) / historicalMeans.length;
        // Normalize drift
        const drift = Math.abs(currentMean - historicalMean) / (historicalMean + 0.001);
        return Math.min(drift, 1.0);
    }
    /**
     * Calculate Jensen-Shannon divergence
     */
    calculateJSDivergence(currentData) {
        let totalJS = 0;
        let count = 0;
        for (const [featureName, currentValues] of Object.entries(currentData)) {
            const baselineValues = this.baselineData.get(featureName);
            if (!baselineValues || baselineValues.length === 0) {
                continue;
            }
            // Create probability distributions
            const baselineHist = this.createNormalizedHistogram(baselineValues, 20);
            const currentHist = this.createNormalizedHistogram(currentValues, 20);
            const js = DriftMetric_js_1.DriftMetricCalculator.calculateJSDivergence(baselineHist, currentHist);
            totalJS += js;
            count++;
        }
        return count > 0 ? totalJS / count : 0;
    }
    /**
     * Create normalized histogram (probability distribution)
     */
    createNormalizedHistogram(data, bins) {
        if (data.length === 0)
            return new Array(bins).fill(1 / bins);
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binWidth = (max - min) / bins;
        const histogram = new Array(bins).fill(0);
        for (const value of data) {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
            histogram[binIndex]++;
        }
        // Normalize to probabilities
        const total = histogram.reduce((sum, count) => sum + count, 0);
        return histogram.map((count) => (count + 0.0001) / (total + 0.0001 * bins));
    }
    /**
     * Get drift explanation
     */
    getDriftExplanation(driftMetric) {
        const explanations = [];
        if (driftMetric.psi > this.config.psiThreshold) {
            explanations.push(`Significant data drift detected (PSI: ${driftMetric.psi.toFixed(3)})`);
        }
        if (driftMetric.affectedFeatures.length > 0) {
            const topDrifted = driftMetric.affectedFeatures
                .sort((a, b) => b.psi - a.psi)
                .slice(0, 3);
            explanations.push(`Top drifted features: ${topDrifted.map((f) => f.featureName).join(', ')}`);
        }
        if (driftMetric.driftVelocity > 0.05) {
            explanations.push(`Rapid drift detected (velocity: ${driftMetric.driftVelocity.toFixed(3)})`);
        }
        if (driftMetric.conceptDrift > 0.1) {
            explanations.push('Concept drift detected - model relationships may have changed');
        }
        return explanations;
    }
}
exports.DriftDetector = DriftDetector;
