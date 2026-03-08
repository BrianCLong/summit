"use strict";
/**
 * Precursor Signal Model
 * Represents early warning indicators that precede anomalies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrecursorSignalModel = exports.ThresholdStatus = exports.PatternShape = void 0;
var PatternShape;
(function (PatternShape) {
    PatternShape["INCREASING"] = "INCREASING";
    PatternShape["DECREASING"] = "DECREASING";
    PatternShape["OSCILLATING"] = "OSCILLATING";
    PatternShape["STEP"] = "STEP";
    PatternShape["SPIKE"] = "SPIKE";
    PatternShape["PLATEAU"] = "PLATEAU";
    PatternShape["SAWTOOTH"] = "SAWTOOTH";
})(PatternShape || (exports.PatternShape = PatternShape = {}));
var ThresholdStatus;
(function (ThresholdStatus) {
    ThresholdStatus["NORMAL"] = "NORMAL";
    ThresholdStatus["WARNING"] = "WARNING";
    ThresholdStatus["CRITICAL"] = "CRITICAL";
    ThresholdStatus["UNKNOWN"] = "UNKNOWN";
})(ThresholdStatus || (exports.ThresholdStatus = ThresholdStatus = {}));
class PrecursorSignalModel {
    /**
     * Determine threshold status based on current value
     */
    static determineThresholdStatus(currentValue, thresholds) {
        if (currentValue >= thresholds.critical) {
            return ThresholdStatus.CRITICAL;
        }
        if (currentValue >= thresholds.warning) {
            return ThresholdStatus.WARNING;
        }
        return ThresholdStatus.NORMAL;
    }
    /**
     * Calculate lead time in human-readable format
     */
    static formatLeadTime(leadTimeMs) {
        const seconds = Math.floor(leadTimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ${hours % 24}h`;
        if (hours > 0)
            return `${hours}h ${minutes % 60}m`;
        if (minutes > 0)
            return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    /**
     * Calculate signal strength (0-1) based on reliability and threshold status
     */
    static calculateSignalStrength(signal) {
        let baseStrength = signal.reliability;
        // Boost strength if currently in warning/critical state
        if (signal.thresholds.currentStatus === ThresholdStatus.CRITICAL) {
            baseStrength *= 1.5;
        }
        else if (signal.thresholds.currentStatus === ThresholdStatus.WARNING) {
            baseStrength *= 1.2;
        }
        // Cap at 1.0
        return Math.min(baseStrength, 1.0);
    }
    /**
     * Rank signals by importance (lead time * reliability * threshold status)
     */
    static rankSignals(signals) {
        return signals.sort((a, b) => {
            const scoreA = this.calculateImportanceScore(a);
            const scoreB = this.calculateImportanceScore(b);
            return scoreB - scoreA; // Descending order
        });
    }
    /**
     * Calculate importance score for ranking
     */
    static calculateImportanceScore(signal) {
        // Longer lead time is more valuable (more time to act)
        const leadTimeScore = Math.log10(signal.leadTimeMs + 1);
        // Higher reliability is better
        const reliabilityScore = signal.reliability;
        // Current threshold status matters
        const statusWeights = {
            [ThresholdStatus.NORMAL]: 1.0,
            [ThresholdStatus.WARNING]: 2.0,
            [ThresholdStatus.CRITICAL]: 3.0,
            [ThresholdStatus.UNKNOWN]: 0.5,
        };
        const statusScore = statusWeights[signal.thresholds.currentStatus];
        return leadTimeScore * reliabilityScore * statusScore;
    }
    /**
     * Check if signal is currently actionable
     */
    static isActionable(signal) {
        return (signal.reliability >= 0.6 &&
            signal.thresholds.currentStatus !== ThresholdStatus.NORMAL);
    }
    /**
     * Get pattern description with statistics
     */
    static describePattern(pattern) {
        const duration = PrecursorSignalModel.formatLeadTime(pattern.typicalDurationMs);
        const confidence = (pattern.confidenceScore * 100).toFixed(1);
        return `${pattern.shape} pattern over ${duration} (${confidence}% confidence)`;
    }
    /**
     * Validate precursor signal data
     */
    static validate(data) {
        const errors = [];
        if (!data.anomalyPredictionId) {
            errors.push('anomalyPredictionId is required');
        }
        if (!data.signalName)
            errors.push('signalName is required');
        if (data.leadTimeMs < 0)
            errors.push('leadTimeMs must be non-negative');
        if (data.reliability < 0 || data.reliability > 1) {
            errors.push('reliability must be between 0 and 1');
        }
        if (data.thresholds.warning < 0 ||
            data.thresholds.critical < data.thresholds.warning) {
            errors.push('invalid threshold values');
        }
        if (data.characteristicPattern.confidenceScore < 0 ||
            data.characteristicPattern.confidenceScore > 1) {
            errors.push('pattern confidenceScore must be between 0 and 1');
        }
        return errors;
    }
    /**
     * Estimate time until threshold breach
     */
    static estimateTimeToThreshold(signal, currentValue, targetThreshold, recentValues) {
        if (recentValues.length < 2)
            return null;
        // Calculate trend (simple linear regression)
        const n = recentValues.length;
        const xMean = (n - 1) / 2;
        const yMean = recentValues.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (recentValues[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }
        const slope = denominator === 0 ? 0 : numerator / denominator;
        if (slope === 0)
            return null; // No trend
        // Calculate time to reach threshold
        const delta = targetThreshold - currentValue;
        const timeSteps = delta / slope;
        if (timeSteps <= 0)
            return null; // Already at or past threshold, or moving away
        // Assuming each value represents 1 time unit (e.g., 1 minute)
        // Adjust based on actual sampling interval
        return timeSteps;
    }
}
exports.PrecursorSignalModel = PrecursorSignalModel;
