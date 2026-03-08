"use strict";
/**
 * Time-series anomaly detection (ARIMA-like, seasonal decomposition)
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
exports.TimeSeriesDetector = void 0;
const stats = __importStar(require("simple-statistics"));
class TimeSeriesDetector {
    config;
    historicalData = new Map();
    constructor(config) {
        this.config = config;
    }
    async detectAnomaly(data) {
        const timestamp = data.timestamp || Date.now();
        const scores = {};
        let totalScore = 0;
        let count = 0;
        for (const [feature, value] of Object.entries(data)) {
            if (typeof value !== 'number' || feature === 'timestamp')
                continue;
            const history = this.historicalData.get(feature) || [];
            if (history.length < this.config.windowSize / 2) {
                // Not enough data yet
                scores[feature] = 0;
                continue;
            }
            const anomalyScore = this.detectTimeSeriesAnomaly(feature, { timestamp, value }, history);
            scores[feature] = anomalyScore;
            totalScore += anomalyScore;
            count++;
        }
        const overallScore = count > 0 ? totalScore / count : 0;
        return {
            score: overallScore,
            method: 'time_series',
            features: scores,
            explanation: this.generateExplanation(scores)
        };
    }
    async updateBaseline(data) {
        const timestamp = data.timestamp || Date.now();
        for (const [feature, value] of Object.entries(data)) {
            if (typeof value !== 'number' || feature === 'timestamp')
                continue;
            if (!this.historicalData.has(feature)) {
                this.historicalData.set(feature, []);
            }
            const history = this.historicalData.get(feature);
            history.push({ timestamp, value });
            // Maintain window size
            if (history.length > this.config.windowSize) {
                history.shift();
            }
        }
    }
    async getBaseline() {
        const baseline = {};
        for (const [feature, data] of this.historicalData.entries()) {
            if (data.length > 0) {
                const values = data.map(d => d.value);
                baseline[feature] = {
                    mean: stats.mean(values),
                    median: stats.median(values),
                    stdDev: stats.standardDeviation(values),
                    trend: this.calculateTrend(data),
                    seasonality: this.config.seasonality,
                    dataPoints: data.length
                };
            }
        }
        return baseline;
    }
    detectTimeSeriesAnomaly(feature, current, history) {
        // Remove trend if configured
        let detrended = [...history];
        if (this.config.trend) {
            detrended = this.removeTrend(history);
        }
        // Remove seasonality if configured
        let deseasoned = detrended;
        if (this.config.seasonality) {
            deseasoned = this.removeSeasonality(detrended, this.config.seasonality);
        }
        // Calculate residuals
        const values = deseasoned.map(d => d.value);
        const mean = stats.mean(values);
        const stdDev = stats.standardDeviation(values);
        if (stdDev === 0)
            return 0;
        // Forecast next value using exponential smoothing
        const forecast = this.exponentialSmoothing(values);
        // Calculate deviation from forecast
        const deviation = Math.abs(current.value - forecast);
        const zScore = deviation / stdDev;
        // Calculate anomaly score
        const anomalyScore = Math.min(1, zScore / 3) * (1 + this.config.sensitivity);
        return Math.min(1, anomalyScore);
    }
    removeTrend(data) {
        const trend = this.calculateTrend(data);
        return data.map((point, index) => ({
            timestamp: point.timestamp,
            value: point.value - (trend.slope * index + trend.intercept)
        }));
    }
    removeSeasonality(data, period) {
        // Calculate seasonal indices
        const seasonalIndices = this.calculateSeasonalIndices(data, period);
        return data.map((point, index) => ({
            timestamp: point.timestamp,
            value: point.value - seasonalIndices[index % period]
        }));
    }
    calculateSeasonalIndices(data, period) {
        const indices = new Array(period).fill(0);
        const counts = new Array(period).fill(0);
        // Calculate average for each seasonal position
        data.forEach((point, index) => {
            const seasonalPos = index % period;
            indices[seasonalPos] += point.value;
            counts[seasonalPos]++;
        });
        // Average and center around mean
        const overallMean = stats.mean(data.map(d => d.value));
        return indices.map((sum, i) => {
            const avg = counts[i] > 0 ? sum / counts[i] : 0;
            return avg - overallMean;
        });
    }
    calculateTrend(data) {
        if (data.length < 2) {
            return { slope: 0, intercept: 0 };
        }
        const x = data.map((_, i) => i);
        const y = data.map(d => d.value);
        const result = stats.linearRegression([x, y]);
        return {
            slope: result.m,
            intercept: result.b
        };
    }
    exponentialSmoothing(values, alpha = 0.3) {
        if (values.length === 0)
            return 0;
        if (values.length === 1)
            return values[0];
        let smoothed = values[0];
        for (let i = 1; i < values.length; i++) {
            smoothed = alpha * values[i] + (1 - alpha) * smoothed;
        }
        return smoothed;
    }
    generateExplanation(scores) {
        const anomalies = Object.entries(scores)
            .filter(([_, score]) => score > 0.5)
            .sort(([_, a], [__, b]) => b - a);
        if (anomalies.length === 0) {
            return 'Time-series behavior within expected range';
        }
        const featureList = anomalies
            .map(([feature, score]) => `${feature} (${(score * 100).toFixed(1)}%)`)
            .join(', ');
        return `Time-series anomalies in: ${featureList}`;
    }
    reset() {
        this.historicalData.clear();
    }
}
exports.TimeSeriesDetector = TimeSeriesDetector;
