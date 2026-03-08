"use strict";
/**
 * Statistical anomaly detection using Z-score, IQR, MAD, etc.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticalAnomalyDetector = void 0;
const threat_detection_core_1 = require("@intelgraph/threat-detection-core");
const stats = __importStar(require("simple-statistics"));
class StatisticalAnomalyDetector {
    baseline = new Map();
    config;
    constructor(config) {
        this.config = config;
    }
    async detectAnomaly(data) {
        const scores = {};
        let totalScore = 0;
        let featureCount = 0;
        // Analyze each numeric feature
        for (const [feature, value] of Object.entries(data)) {
            if (typeof value !== 'number')
                continue;
            const baselineData = this.baseline.get(feature);
            if (!baselineData || baselineData.length < 2) {
                // Not enough data for baseline
                scores[feature] = 0;
                continue;
            }
            const anomalyScore = await this.detectFeatureAnomaly(feature, value, baselineData);
            scores[feature] = anomalyScore;
            totalScore += anomalyScore;
            featureCount++;
            // Auto-update baseline if configured
            if (this.config.autoUpdate && anomalyScore < 0.7) {
                await this.updateBaseline({ [feature]: value });
            }
        }
        const overallScore = featureCount > 0 ? totalScore / featureCount : 0;
        return {
            score: Math.min(1, overallScore * (1 + this.config.sensitivity)),
            method: this.config.method,
            features: scores,
            explanation: this.generateExplanation(scores, overallScore)
        };
    }
    async detectFeatureAnomaly(feature, value, baselineData) {
        switch (this.config.method) {
            case 'zscore':
                return this.zScoreMethod(value, baselineData);
            case 'iqr':
                return this.iqrMethod(value, baselineData);
            case 'mad':
                return this.madMethod(value, baselineData);
            case 'grubbs':
                return this.grubbsMethod(value, baselineData);
            case 'ensemble':
                return this.ensembleMethod(value, baselineData);
            default:
                return this.zScoreMethod(value, baselineData);
        }
    }
    zScoreMethod(value, baselineData) {
        const mean = stats.mean(baselineData);
        const stdDev = stats.standardDeviation(baselineData);
        if (stdDev === 0)
            return 0;
        const zScore = (0, threat_detection_core_1.calculateZScore)(value, mean, stdDev);
        return (0, threat_detection_core_1.zScoreToAnomalyScore)(zScore);
    }
    iqrMethod(value, baselineData) {
        const sorted = [...baselineData].sort((a, b) => a - b);
        const q1 = stats.quantile(sorted, 0.25);
        const q3 = stats.quantile(sorted, 0.75);
        return (0, threat_detection_core_1.calculateIQRScore)(value, q1, q3);
    }
    madMethod(value, baselineData) {
        // Median Absolute Deviation
        const median = stats.median(baselineData);
        const absoluteDeviations = baselineData.map(x => Math.abs(x - median));
        const mad = stats.median(absoluteDeviations);
        if (mad === 0)
            return 0;
        const modifiedZScore = 0.6745 * (value - median) / mad;
        return (0, threat_detection_core_1.zScoreToAnomalyScore)(modifiedZScore);
    }
    grubbsMethod(value, baselineData) {
        // Grubbs test for outliers
        const mean = stats.mean(baselineData);
        const stdDev = stats.standardDeviation(baselineData);
        const n = baselineData.length;
        if (stdDev === 0 || n < 3)
            return 0;
        const g = Math.abs(value - mean) / stdDev;
        // Critical value approximation for 95% confidence
        const tDist = 1.96; // Approximation
        const gCritical = ((n - 1) / Math.sqrt(n)) *
            Math.sqrt(Math.pow(tDist, 2) / (n - 2 + Math.pow(tDist, 2)));
        return g > gCritical ? Math.min(1, g / (2 * gCritical)) : 0;
    }
    ensembleMethod(value, baselineData) {
        // Combine multiple methods
        const scores = [
            this.zScoreMethod(value, baselineData),
            this.iqrMethod(value, baselineData),
            this.madMethod(value, baselineData)
        ];
        // Return max score (most conservative)
        return Math.max(...scores);
    }
    async updateBaseline(data) {
        for (const [feature, value] of Object.entries(data)) {
            if (typeof value !== 'number')
                continue;
            if (!this.baseline.has(feature)) {
                this.baseline.set(feature, []);
            }
            const baselineData = this.baseline.get(feature);
            baselineData.push(value);
            // Maintain window size
            if (this.config.windowSize && baselineData.length > this.config.windowSize) {
                baselineData.shift();
            }
        }
    }
    async getBaseline() {
        const baseline = {};
        for (const [feature, data] of this.baseline.entries()) {
            if (data.length > 0) {
                baseline[feature] = {
                    mean: stats.mean(data),
                    median: stats.median(data),
                    stdDev: stats.standardDeviation(data),
                    min: stats.min(data),
                    max: stats.max(data),
                    q1: stats.quantile(data, 0.25),
                    q3: stats.quantile(data, 0.75),
                    sampleSize: data.length
                };
            }
        }
        return baseline;
    }
    generateExplanation(featureScores, overallScore) {
        const anomalousFeatures = Object.entries(featureScores)
            .filter(([_, score]) => score > 0.5)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 3);
        if (anomalousFeatures.length === 0) {
            return 'No significant anomalies detected';
        }
        const featureList = anomalousFeatures
            .map(([feature, score]) => `${feature} (${(score * 100).toFixed(1)}%)`)
            .join(', ');
        return `Anomaly detected in ${anomalousFeatures.length} feature(s): ${featureList}`;
    }
    reset() {
        this.baseline.clear();
    }
    setBaseline(baseline) {
        this.baseline = baseline;
    }
}
exports.StatisticalAnomalyDetector = StatisticalAnomalyDetector;
