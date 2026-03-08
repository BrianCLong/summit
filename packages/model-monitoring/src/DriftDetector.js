"use strict";
/**
 * Drift Detector
 * Detects data drift, prediction drift, and concept drift in production models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftDetector = void 0;
const events_1 = require("events");
class DriftDetector extends events_1.EventEmitter {
    config;
    referenceData;
    currentData;
    driftHistory;
    constructor(config) {
        super();
        this.config = config;
        this.referenceData = [];
        this.currentData = [];
        this.driftHistory = [];
    }
    /**
     * Set reference/baseline data
     */
    async setReferenceData(samples) {
        this.referenceData = samples;
        this.emit('reference:updated', {
            sampleCount: samples.length,
        });
    }
    /**
     * Add current production data
     */
    async addSample(sample) {
        this.currentData.push(sample);
        // Maintain window size
        if (this.config.driftDetection.windowSize &&
            this.currentData.length > this.config.driftDetection.windowSize) {
            this.currentData.shift();
        }
        // Check if we should run drift detection
        if (this.currentData.length >= this.config.driftDetection.windowSize) {
            await this.detectDrift();
        }
    }
    /**
     * Detect drift
     */
    async detectDrift() {
        if (this.referenceData.length === 0) {
            throw new Error('Reference data not set');
        }
        const results = [];
        // Detect data drift
        const dataDrift = await this.detectDataDrift();
        if (dataDrift) {
            results.push(dataDrift);
        }
        // Detect prediction drift
        const predictionDrift = await this.detectPredictionDrift();
        if (predictionDrift) {
            results.push(predictionDrift);
        }
        // Detect concept drift
        const conceptDrift = await this.detectConceptDrift();
        if (conceptDrift) {
            results.push(conceptDrift);
        }
        // Store history
        this.driftHistory.push(...results);
        // Emit events for detected drift
        for (const result of results) {
            if (result.detected) {
                this.emit('drift:detected', result);
            }
        }
        return results;
    }
    /**
     * Detect data drift (feature distribution changes)
     */
    async detectDataDrift() {
        const featureNames = this.getFeatureNames();
        const affectedFeatures = [];
        let maxDrift = 0;
        for (const featureName of featureNames) {
            const referenceValues = this.referenceData.map(s => s.features[featureName]);
            const currentValues = this.currentData.map(s => s.features[featureName]);
            // Calculate drift metrics
            const metrics = await this.calculateDriftMetrics(referenceValues, currentValues);
            const driftScore = this.getDriftScore(metrics);
            if (driftScore > maxDrift) {
                maxDrift = driftScore;
            }
            if (driftScore > this.config.driftDetection.threshold) {
                affectedFeatures.push({
                    name: featureName,
                    baseline: this.calculateStats(referenceValues),
                    current: this.calculateStats(currentValues),
                    drift: driftScore,
                });
            }
        }
        const detected = maxDrift > this.config.driftDetection.threshold;
        return {
            timestamp: new Date(),
            driftType: 'data-drift',
            detected,
            severity: this.getSeverity(maxDrift),
            metrics: {
                distance: maxDrift,
                threshold: this.config.driftDetection.threshold,
            },
            affectedFeatures,
            recommendations: detected
                ? [
                    'Review feature engineering pipeline',
                    'Check data source changes',
                    'Consider model retraining',
                ]
                : [],
        };
    }
    /**
     * Detect prediction drift (output distribution changes)
     */
    async detectPredictionDrift() {
        const referencePredictions = this.referenceData
            .map(s => s.prediction)
            .filter(p => p !== undefined);
        const currentPredictions = this.currentData
            .map(s => s.prediction)
            .filter(p => p !== undefined);
        if (referencePredictions.length === 0 || currentPredictions.length === 0) {
            return null;
        }
        const metrics = await this.calculateDriftMetrics(referencePredictions, currentPredictions);
        const driftScore = this.getDriftScore(metrics);
        const detected = driftScore > this.config.driftDetection.threshold;
        return {
            timestamp: new Date(),
            driftType: 'prediction-drift',
            detected,
            severity: this.getSeverity(driftScore),
            metrics: {
                distance: driftScore,
                threshold: this.config.driftDetection.threshold,
            },
            recommendations: detected
                ? [
                    'Investigate prediction distribution shift',
                    'Check for upstream data changes',
                    'Validate model performance',
                ]
                : [],
        };
    }
    /**
     * Detect concept drift (relationship between features and target changes)
     */
    async detectConceptDrift() {
        const samplesWithActuals = this.currentData.filter(s => s.prediction !== undefined && s.actual !== undefined);
        if (samplesWithActuals.length < 100) {
            return null; // Need enough samples
        }
        // Calculate accuracy/error rate
        const errors = samplesWithActuals.filter(s => s.prediction !== s.actual).length;
        const errorRate = errors / samplesWithActuals.length;
        // Compare with expected error rate
        const expectedErrorRate = 0.1; // Mock baseline
        const drift = Math.abs(errorRate - expectedErrorRate);
        const detected = drift > this.config.driftDetection.threshold * 0.5;
        return {
            timestamp: new Date(),
            driftType: 'concept-drift',
            detected,
            severity: this.getSeverity(drift * 2),
            metrics: {
                distance: drift,
                threshold: this.config.driftDetection.threshold * 0.5,
            },
            recommendations: detected
                ? [
                    'Model retraining required',
                    'Investigate relationship changes',
                    'Review feature relevance',
                ]
                : [],
        };
    }
    /**
     * Calculate drift metrics
     */
    async calculateDriftMetrics(reference, current) {
        // PSI (Population Stability Index)
        const psi = this.calculatePSI(reference, current);
        // KL Divergence
        const kl = this.calculateKLDivergence(reference, current);
        // Kolmogorov-Smirnov
        const ks = this.calculateKS(reference, current);
        // Chi-Squared
        const chiSquared = this.calculateChiSquared(reference, current);
        return { psi, kl, ks, chiSquared };
    }
    /**
     * Calculate Population Stability Index
     */
    calculatePSI(reference, current) {
        // Simplified PSI calculation
        const refDist = this.getDistribution(reference);
        const currDist = this.getDistribution(current);
        let psi = 0;
        const allKeys = new Set([...Object.keys(refDist), ...Object.keys(currDist)]);
        for (const key of allKeys) {
            const refPct = refDist[key] || 0.0001;
            const currPct = currDist[key] || 0.0001;
            psi += (currPct - refPct) * Math.log(currPct / refPct);
        }
        return psi;
    }
    /**
     * Calculate KL Divergence
     */
    calculateKLDivergence(reference, current) {
        const refDist = this.getDistribution(reference);
        const currDist = this.getDistribution(current);
        let kl = 0;
        for (const key of Object.keys(refDist)) {
            const p = refDist[key];
            const q = currDist[key] || 0.0001;
            kl += p * Math.log(p / q);
        }
        return kl;
    }
    /**
     * Calculate Kolmogorov-Smirnov statistic
     */
    calculateKS(reference, current) {
        // Only for numeric data
        const refNums = reference.filter(v => typeof v === 'number').sort((a, b) => a - b);
        const currNums = current.filter(v => typeof v === 'number').sort((a, b) => a - b);
        if (refNums.length === 0 || currNums.length === 0) {
            return 0;
        }
        let maxDiff = 0;
        const allValues = [...new Set([...refNums, ...currNums])].sort((a, b) => a - b);
        for (const value of allValues) {
            const refCDF = refNums.filter(v => v <= value).length / refNums.length;
            const currCDF = currNums.filter(v => v <= value).length / currNums.length;
            maxDiff = Math.max(maxDiff, Math.abs(refCDF - currCDF));
        }
        return maxDiff;
    }
    /**
     * Calculate Chi-Squared statistic
     */
    calculateChiSquared(reference, current) {
        const refDist = this.getDistribution(reference);
        const currDist = this.getDistribution(current);
        let chiSq = 0;
        const allKeys = new Set([...Object.keys(refDist), ...Object.keys(currDist)]);
        for (const key of allKeys) {
            const expected = (refDist[key] || 0) * current.length;
            const observed = (currDist[key] || 0) * current.length;
            if (expected > 0) {
                chiSq += Math.pow(observed - expected, 2) / expected;
            }
        }
        return chiSq;
    }
    /**
     * Get distribution of values
     */
    getDistribution(values) {
        const counts = {};
        for (const value of values) {
            const key = String(value);
            counts[key] = (counts[key] || 0) + 1;
        }
        const total = values.length;
        const distribution = {};
        for (const [key, count] of Object.entries(counts)) {
            distribution[key] = count / total;
        }
        return distribution;
    }
    /**
     * Calculate statistics for a feature
     */
    calculateStats(values) {
        const nums = values.filter(v => typeof v === 'number');
        if (nums.length === 0) {
            return {};
        }
        const sorted = nums.sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        return {
            mean,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            count: nums.length,
        };
    }
    /**
     * Get drift score from metrics
     */
    getDriftScore(metrics) {
        // Weighted combination of metrics
        return (metrics.psi * 0.3 +
            metrics.kl * 0.3 +
            metrics.ks * 0.2 +
            metrics.chiSquared * 0.2);
    }
    /**
     * Get severity level
     */
    getSeverity(drift) {
        const threshold = this.config.driftDetection.threshold;
        if (drift > threshold * 3) {
            return 'critical';
        }
        if (drift > threshold * 2) {
            return 'high';
        }
        if (drift > threshold) {
            return 'medium';
        }
        return 'low';
    }
    /**
     * Get feature names
     */
    getFeatureNames() {
        if (this.referenceData.length === 0) {
            return [];
        }
        return Object.keys(this.referenceData[0].features);
    }
    /**
     * Get drift history
     */
    async getDriftHistory(driftType, startTime, endTime) {
        let history = [...this.driftHistory];
        if (driftType) {
            history = history.filter(h => h.driftType === driftType);
        }
        if (startTime) {
            history = history.filter(h => h.timestamp >= startTime);
        }
        if (endTime) {
            history = history.filter(h => h.timestamp <= endTime);
        }
        return history;
    }
    /**
     * Clear current data window
     */
    async clearCurrentData() {
        this.currentData = [];
    }
    /**
     * Reset detector
     */
    async reset() {
        this.referenceData = [];
        this.currentData = [];
        this.driftHistory = [];
    }
}
exports.DriftDetector = DriftDetector;
