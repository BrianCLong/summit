"use strict";
/**
 * Bias Analyzer Algorithm
 * Analyzes prediction bias and fairness metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiasAnalyzer = void 0;
const IntegrityReport_js_1 = require("../models/IntegrityReport.js");
class BiasAnalyzer {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Analyze bias in predictions
     */
    analyzeBias(predictions) {
        // Group data by protected attributes
        const groupedData = this.groupByProtectedAttributes(predictions);
        // Calculate fairness metrics
        const demographicParity = this.calculateDemographicParity(groupedData);
        const equalOpportunity = this.calculateEqualOpportunity(groupedData);
        const equalizedOdds = this.calculateEqualizedOdds(groupedData);
        const calibrationError = this.calculateCalibrationError(groupedData);
        const disparateImpact = this.calculateDisparateImpact(groupedData);
        // Analyze groups
        const affectedGroups = this.analyzeGroups(groupedData);
        // Determine severity
        const severity = this.determineBiasSeverity(demographicParity, equalOpportunity, disparateImpact);
        // Generate mitigation strategies
        const mitigationStrategies = this.generateMitigationStrategies(demographicParity, equalOpportunity, calibrationError);
        return {
            demographicParity,
            equalOpportunity,
            equalizedOdds,
            calibrationError,
            disparateImpact,
            severity,
            biasDetected: demographicParity < this.config.demographicParityThreshold ||
                equalOpportunity < this.config.equalOpportunityThreshold,
            affectedGroups,
            protectedAttributes: this.config.protectedAttributes,
            mitigationStrategies,
        };
    }
    /**
     * Group predictions by protected attributes
     */
    groupByProtectedAttributes(predictions) {
        const groups = new Map();
        for (const pred of predictions) {
            for (const attr of this.config.protectedAttributes) {
                const value = pred.protectedAttributes?.[attr] || pred.features[attr];
                const key = `${attr}:${value}`;
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push(pred);
            }
        }
        return groups;
    }
    /**
     * Calculate Demographic Parity
     * P(Ŷ = 1 | A = a) ≈ P(Ŷ = 1 | A = b)
     */
    calculateDemographicParity(groupedData) {
        const selectionRates = [];
        for (const [groupName, predictions] of groupedData.entries()) {
            const positiveRate = predictions.filter((p) => p.prediction >= 0.5).length /
                predictions.length;
            selectionRates.push(positiveRate);
        }
        if (selectionRates.length < 2)
            return 1.0;
        // Calculate minimum ratio between any two groups
        const minRate = Math.min(...selectionRates);
        const maxRate = Math.max(...selectionRates);
        return maxRate > 0 ? minRate / maxRate : 1.0;
    }
    /**
     * Calculate Equal Opportunity
     * P(Ŷ = 1 | Y = 1, A = a) ≈ P(Ŷ = 1 | Y = 1, A = b)
     */
    calculateEqualOpportunity(groupedData) {
        const tprRates = [];
        for (const [groupName, predictions] of groupedData.entries()) {
            const positives = predictions.filter((p) => p.trueLabel === 1);
            if (positives.length === 0)
                continue;
            const truePositives = positives.filter((p) => p.prediction >= 0.5).length;
            const tpr = truePositives / positives.length;
            tprRates.push(tpr);
        }
        if (tprRates.length < 2)
            return 1.0;
        const minTPR = Math.min(...tprRates);
        const maxTPR = Math.max(...tprRates);
        return maxTPR > 0 ? minTPR / maxTPR : 1.0;
    }
    /**
     * Calculate Equalized Odds
     * Combination of TPR and FPR parity
     */
    calculateEqualizedOdds(groupedData) {
        const tprRates = [];
        const fprRates = [];
        for (const [groupName, predictions] of groupedData.entries()) {
            // True Positive Rate
            const positives = predictions.filter((p) => p.trueLabel === 1);
            if (positives.length > 0) {
                const truePositives = positives.filter((p) => p.prediction >= 0.5).length;
                tprRates.push(truePositives / positives.length);
            }
            // False Positive Rate
            const negatives = predictions.filter((p) => p.trueLabel === 0);
            if (negatives.length > 0) {
                const falsePositives = negatives.filter((p) => p.prediction >= 0.5).length;
                fprRates.push(falsePositives / negatives.length);
            }
        }
        if (tprRates.length < 2 || fprRates.length < 2)
            return 1.0;
        const tprParity = Math.min(...tprRates) / Math.max(...tprRates) || 1.0;
        const fprParity = Math.min(...fprRates) / Math.max(...fprRates) || 1.0;
        return (tprParity + fprParity) / 2;
    }
    /**
     * Calculate Calibration Error
     * |P(Y = 1 | Ŷ = p, A = a) - p|
     */
    calculateCalibrationError(groupedData) {
        let totalError = 0;
        let count = 0;
        for (const [groupName, predictions] of groupedData.entries()) {
            const withLabels = predictions.filter((p) => p.trueLabel !== undefined);
            if (withLabels.length === 0)
                continue;
            // Bin predictions
            const bins = 10;
            for (let i = 0; i < bins; i++) {
                const lower = i / bins;
                const upper = (i + 1) / bins;
                const binPredictions = withLabels.filter((p) => p.prediction >= lower && p.prediction < upper);
                if (binPredictions.length === 0)
                    continue;
                const avgPrediction = binPredictions.reduce((sum, p) => sum + p.prediction, 0) /
                    binPredictions.length;
                const actualRate = binPredictions.filter((p) => p.trueLabel === 1).length /
                    binPredictions.length;
                totalError += Math.abs(avgPrediction - actualRate);
                count++;
            }
        }
        return count > 0 ? totalError / count : 0;
    }
    /**
     * Calculate Disparate Impact
     * P(Ŷ = 1 | A = unprivileged) / P(Ŷ = 1 | A = privileged)
     */
    calculateDisparateImpact(groupedData) {
        const selectionRates = [];
        for (const [groupName, predictions] of groupedData.entries()) {
            const positiveRate = predictions.filter((p) => p.prediction >= 0.5).length /
                predictions.length;
            selectionRates.push(positiveRate);
        }
        if (selectionRates.length < 2)
            return 1.0;
        const minRate = Math.min(...selectionRates);
        const maxRate = Math.max(...selectionRates);
        return maxRate > 0 ? minRate / maxRate : 1.0;
    }
    /**
     * Analyze individual groups
     */
    analyzeGroups(groupedData) {
        const groups = [];
        for (const [groupKey, predictions] of groupedData.entries()) {
            const [attribute, value] = groupKey.split(':');
            // Calculate metrics
            const selectionRate = predictions.filter((p) => p.prediction >= 0.5).length /
                predictions.length;
            const positives = predictions.filter((p) => p.trueLabel === 1);
            const negatives = predictions.filter((p) => p.trueLabel === 0);
            const truePositives = positives.filter((p) => p.prediction >= 0.5).length;
            const falsePositives = negatives.filter((p) => p.prediction >= 0.5).length;
            const truePositiveRate = positives.length > 0
                ? truePositives / positives.length
                : 0;
            const falsePositiveRate = negatives.length > 0
                ? falsePositives / negatives.length
                : 0;
            const precision = truePositives + falsePositives > 0
                ? truePositives / (truePositives + falsePositives)
                : 0;
            const recall = truePositiveRate;
            // Compare to overall population
            const allPredictions = Array.from(groupedData.values()).flat();
            const overallSelectionRate = allPredictions.filter((p) => p.prediction >= 0.5).length /
                allPredictions.length;
            const disparityRatio = overallSelectionRate > 0
                ? selectionRate / overallSelectionRate
                : 1.0;
            groups.push({
                groupName: groupKey,
                protectedAttribute: attribute,
                groupValue: value,
                selectionRate,
                truePositiveRate,
                falsePositiveRate,
                precision,
                recall,
                disparityRatio,
                isUnderrepresented: disparityRatio < 0.8,
            });
        }
        return groups;
    }
    /**
     * Determine bias severity
     */
    determineBiasSeverity(demographicParity, equalOpportunity, disparateImpact) {
        const minScore = Math.min(demographicParity, equalOpportunity, disparateImpact);
        if (minScore >= 0.95)
            return IntegrityReport_js_1.BiasSeverity.NONE;
        if (minScore >= 0.85)
            return IntegrityReport_js_1.BiasSeverity.LOW;
        if (minScore >= 0.75)
            return IntegrityReport_js_1.BiasSeverity.MODERATE;
        if (minScore >= 0.6)
            return IntegrityReport_js_1.BiasSeverity.HIGH;
        return IntegrityReport_js_1.BiasSeverity.SEVERE;
    }
    /**
     * Generate mitigation strategies
     */
    generateMitigationStrategies(demographicParity, equalOpportunity, calibrationError) {
        const strategies = [];
        if (demographicParity < 0.8) {
            strategies.push('Apply demographic parity constraints during model training');
            strategies.push('Use reweighting to balance selection rates across groups');
        }
        if (equalOpportunity < 0.8) {
            strategies.push('Implement equalized odds post-processing');
            strategies.push('Adjust decision thresholds per group');
        }
        if (calibrationError > 0.1) {
            strategies.push('Apply Platt scaling or isotonic regression for calibration');
            strategies.push('Separate calibration per protected group');
        }
        if (strategies.length === 0) {
            strategies.push('Continue monitoring - no immediate mitigation required');
        }
        return strategies;
    }
}
exports.BiasAnalyzer = BiasAnalyzer;
