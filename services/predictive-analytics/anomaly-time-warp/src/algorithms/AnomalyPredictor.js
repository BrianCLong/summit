"use strict";
/**
 * Anomaly Predictor Algorithm
 * Forecasts when anomalies will occur based on historical patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyPredictor = void 0;
const AnomalyPrediction_js_1 = require("../models/AnomalyPrediction.js");
class AnomalyPredictor {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Predict upcoming anomalies for an entity
     */
    async predict(entityId, timeSeries, historicalAnomalies) {
        const predictions = [];
        // Extract features from time series
        const features = this.extractFeatures(timeSeries);
        // Apply multiple prediction models
        const arimaPredictions = this.predictWithARIMA(entityId, timeSeries, historicalAnomalies);
        const trendPredictions = this.predictWithTrendAnalysis(entityId, timeSeries, features);
        const patternPredictions = this.predictWithPatternMatching(entityId, timeSeries, historicalAnomalies);
        // Ensemble predictions
        const ensemblePredictions = this.ensemblePredictions([
            ...arimaPredictions,
            ...trendPredictions,
            ...patternPredictions,
        ]);
        // Filter by confidence threshold
        return ensemblePredictions.filter((p) => p.confidence >= this.config.minConfidence);
    }
    /**
     * Extract statistical features from time series
     */
    extractFeatures(timeSeries) {
        const features = new Map();
        for (const ts of timeSeries) {
            const values = ts.dataPoints.map((p) => p.value);
            features.set(`${ts.metricName}_mean`, [this.calculateMean(values)]);
            features.set(`${ts.metricName}_variance`, [
                this.calculateVariance(values),
            ]);
            features.set(`${ts.metricName}_skewness`, [
                this.calculateSkewness(values),
            ]);
            features.set(`${ts.metricName}_kurtosis`, [
                this.calculateKurtosis(values),
            ]);
            features.set(`${ts.metricName}_trend`, [this.calculateTrend(values)]);
            features.set(`${ts.metricName}_volatility`, [
                this.calculateVolatility(values),
            ]);
        }
        return features;
    }
    /**
     * ARIMA-based prediction (simplified implementation)
     */
    predictWithARIMA(entityId, timeSeries, historicalAnomalies) {
        const predictions = [];
        // For each metric, check if it's trending toward anomalous values
        for (const ts of timeSeries) {
            const values = ts.dataPoints.map((p) => p.value);
            if (values.length < 10)
                continue; // Need sufficient history
            // Calculate forecast
            const forecast = this.simpleAutoRegression(values, 10);
            // Check if forecast values are anomalous
            const mean = this.calculateMean(values);
            const stdDev = Math.sqrt(this.calculateVariance(values));
            const threshold = mean + 3 * stdDev; // 3-sigma rule
            for (let i = 0; i < forecast.length; i++) {
                if (Math.abs(forecast[i]) > threshold) {
                    const onsetTime = new Date(ts.endTime.getTime() + i * this.config.windowSizeMs);
                    const confidence = this.calculateForecastConfidence(values, i);
                    if (onsetTime.getTime() <= Date.now() + this.config.lookaheadMs) {
                        predictions.push({
                            entityId,
                            predictedOnsetTime: onsetTime,
                            onsetWindow: this.calculateOnsetWindow(onsetTime, confidence),
                            expectedSeverity: this.estimateSeverity(forecast[i], mean, stdDev),
                            confidence,
                            contributingFactors: [`${ts.metricName} forecast anomaly`],
                            metadata: {
                                method: 'ARIMA',
                                forecastValue: forecast[i],
                                threshold,
                            },
                        });
                    }
                }
            }
        }
        return predictions;
    }
    /**
     * Trend-based prediction
     */
    predictWithTrendAnalysis(entityId, timeSeries, features) {
        const predictions = [];
        for (const ts of timeSeries) {
            const values = ts.dataPoints.map((p) => p.value);
            const trend = this.calculateTrend(values);
            const volatility = this.calculateVolatility(values);
            // High trend + high volatility = potential anomaly
            if (Math.abs(trend) > 0.5 && volatility > 1.0) {
                const onsetTime = new Date(ts.endTime.getTime() + 15 * 60 * 1000); // 15 min ahead
                const confidence = Math.min(Math.abs(trend) * volatility * 0.5, 0.95);
                if (onsetTime.getTime() <= Date.now() + this.config.lookaheadMs) {
                    predictions.push({
                        entityId,
                        predictedOnsetTime: onsetTime,
                        onsetWindow: this.calculateOnsetWindow(onsetTime, confidence),
                        expectedSeverity: this.estimateSeverityFromTrend(trend, volatility),
                        confidence,
                        contributingFactors: [
                            `${ts.metricName} trend acceleration`,
                            'High volatility',
                        ],
                        metadata: {
                            method: 'TREND',
                            trend,
                            volatility,
                        },
                    });
                }
            }
        }
        return predictions;
    }
    /**
     * Pattern matching prediction
     */
    predictWithPatternMatching(entityId, timeSeries, historicalAnomalies) {
        const predictions = [];
        // Check if current pattern matches historical pre-anomaly patterns
        for (const pattern of historicalAnomalies) {
            const matchScore = this.calculatePatternMatchScore(timeSeries, pattern);
            if (matchScore > 0.7) {
                const onsetTime = new Date(Date.now() + pattern.precursorWindow);
                const confidence = matchScore * 0.9; // Slightly conservative
                if (onsetTime.getTime() <= Date.now() + this.config.lookaheadMs) {
                    predictions.push({
                        entityId,
                        predictedOnsetTime: onsetTime,
                        onsetWindow: this.calculateOnsetWindow(onsetTime, confidence),
                        expectedSeverity: pattern.severity,
                        confidence,
                        contributingFactors: ['Historical pattern match'],
                        metadata: {
                            method: 'PATTERN_MATCH',
                            matchScore,
                            patternFrequency: pattern.frequency,
                        },
                    });
                }
            }
        }
        return predictions;
    }
    /**
     * Ensemble multiple predictions
     */
    ensemblePredictions(predictions) {
        if (predictions.length === 0)
            return [];
        // Group predictions by similar onset time (within 1 hour)
        const groups = [];
        const oneHour = 60 * 60 * 1000;
        for (const pred of predictions) {
            let added = false;
            for (const group of groups) {
                const timeDiff = Math.abs(group[0].predictedOnsetTime.getTime() -
                    pred.predictedOnsetTime.getTime());
                if (timeDiff < oneHour) {
                    group.push(pred);
                    added = true;
                    break;
                }
            }
            if (!added) {
                groups.push([pred]);
            }
        }
        // Average predictions within each group
        const ensemble = [];
        for (const group of groups) {
            const avgOnsetTime = new Date(group.reduce((sum, p) => sum + p.predictedOnsetTime.getTime(), 0) /
                group.length);
            const avgConfidence = group.reduce((sum, p) => sum + p.confidence, 0) / group.length;
            const maxSeverity = this.maxSeverity(group.map((p) => p.expectedSeverity));
            const contributingFactors = Array.from(new Set(group.flatMap((p) => p.contributingFactors)));
            ensemble.push({
                entityId: group[0].entityId,
                predictedOnsetTime: avgOnsetTime,
                onsetWindow: this.calculateOnsetWindow(avgOnsetTime, avgConfidence),
                expectedSeverity: maxSeverity,
                confidence: avgConfidence,
                contributingFactors,
                metadata: {
                    method: 'ENSEMBLE',
                    modelCount: group.length,
                },
            });
        }
        return ensemble;
    }
    // === Helper Functions ===
    calculateMean(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    calculateVariance(values) {
        const mean = this.calculateMean(values);
        return (values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            values.length);
    }
    calculateSkewness(values) {
        const mean = this.calculateMean(values);
        const variance = this.calculateVariance(values);
        const stdDev = Math.sqrt(variance);
        const n = values.length;
        const skew = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) /
            n;
        return skew;
    }
    calculateKurtosis(values) {
        const mean = this.calculateMean(values);
        const variance = this.calculateVariance(values);
        const stdDev = Math.sqrt(variance);
        const n = values.length;
        const kurt = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) /
            n -
            3;
        return kurt;
    }
    calculateTrend(values) {
        const n = values.length;
        if (n < 2)
            return 0;
        const xMean = (n - 1) / 2;
        const yMean = this.calculateMean(values);
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += Math.pow(i - xMean, 2);
        }
        return denominator === 0 ? 0 : numerator / denominator;
    }
    calculateVolatility(values) {
        if (values.length < 2)
            return 0;
        const returns = [];
        for (let i = 1; i < values.length; i++) {
            returns.push((values[i] - values[i - 1]) / values[i - 1]);
        }
        return Math.sqrt(this.calculateVariance(returns));
    }
    simpleAutoRegression(values, steps) {
        const forecast = [];
        const order = Math.min(5, Math.floor(values.length / 2)); // AR(5) or less
        for (let i = 0; i < steps; i++) {
            let prediction = 0;
            const recentValues = [...values, ...forecast].slice(-(order + 1));
            // Simple AR: next = weighted average of recent values
            for (let j = 0; j < order; j++) {
                const weight = (order - j) / ((order * (order + 1)) / 2);
                prediction += weight * recentValues[recentValues.length - 1 - j];
            }
            forecast.push(prediction);
        }
        return forecast;
    }
    calculateForecastConfidence(historicalValues, stepsAhead) {
        // Confidence decreases with forecast horizon
        const baseConfidence = 0.9;
        const decayRate = 0.05;
        return Math.max(baseConfidence - stepsAhead * decayRate, 0.5);
    }
    estimateSeverity(forecastValue, mean, stdDev) {
        const zScore = Math.abs((forecastValue - mean) / stdDev);
        if (zScore > 5)
            return AnomalyPrediction_js_1.Severity.CRITICAL;
        if (zScore > 4)
            return AnomalyPrediction_js_1.Severity.HIGH;
        if (zScore > 3)
            return AnomalyPrediction_js_1.Severity.MEDIUM;
        return AnomalyPrediction_js_1.Severity.LOW;
    }
    estimateSeverityFromTrend(trend, volatility) {
        const score = Math.abs(trend) * volatility;
        if (score > 2.0)
            return AnomalyPrediction_js_1.Severity.CRITICAL;
        if (score > 1.5)
            return AnomalyPrediction_js_1.Severity.HIGH;
        if (score > 1.0)
            return AnomalyPrediction_js_1.Severity.MEDIUM;
        return AnomalyPrediction_js_1.Severity.LOW;
    }
    calculateOnsetWindow(predictedTime, confidence) {
        // Window size inversely proportional to confidence
        const baseWindowMs = 30 * 60 * 1000; // 30 minutes
        const windowMs = baseWindowMs / confidence;
        const earliest = new Date(predictedTime.getTime() - windowMs / 2);
        const latest = new Date(predictedTime.getTime() + windowMs / 2);
        return {
            earliest,
            latest,
            confidence,
            timeUntilOnsetMs: predictedTime.getTime() - Date.now(),
        };
    }
    calculatePatternMatchScore(timeSeries, pattern) {
        // Simplified pattern matching (would use DTW in production)
        let totalScore = 0;
        let count = 0;
        for (const ts of timeSeries) {
            const values = ts.dataPoints.map((p) => p.value);
            const trend = this.calculateTrend(values);
            const volatility = this.calculateVolatility(values);
            // Check if current trend matches pattern characteristics
            const trendMatch = Math.abs(trend) > 0.3 ? 0.5 : 0.2;
            const volatilityMatch = volatility > 0.8 ? 0.5 : 0.2;
            totalScore += trendMatch + volatilityMatch;
            count++;
        }
        return count > 0 ? totalScore / count : 0;
    }
    maxSeverity(severities) {
        const order = [AnomalyPrediction_js_1.Severity.LOW, AnomalyPrediction_js_1.Severity.MEDIUM, AnomalyPrediction_js_1.Severity.HIGH, AnomalyPrediction_js_1.Severity.CRITICAL];
        let maxIdx = 0;
        for (const severity of severities) {
            const idx = order.indexOf(severity);
            if (idx > maxIdx)
                maxIdx = idx;
        }
        return order[maxIdx];
    }
}
exports.AnomalyPredictor = AnomalyPredictor;
