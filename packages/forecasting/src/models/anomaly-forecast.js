"use strict";
/**
 * Anomaly Forecasting and Detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyForecaster = void 0;
class AnomalyForecaster {
    threshold;
    windowSize;
    historicalData = [];
    constructor(threshold = 3.0, windowSize = 30) {
        this.threshold = threshold;
        this.windowSize = windowSize;
    }
    /**
     * Fit the anomaly detection model
     */
    fit(data) {
        this.historicalData = [...data];
    }
    /**
     * Forecast future anomalies
     */
    forecastAnomalies(horizon) {
        const results = [];
        // Analyze historical patterns
        const spikeProbability = this.calculateSpikeProbability();
        const seasonalAnomalies = this.detectSeasonalAnomalies();
        const lastTimestamp = this.historicalData[this.historicalData.length - 1].timestamp;
        for (let h = 1; h <= horizon; h++) {
            const timestamp = new Date(lastTimestamp.getTime() + h * 24 * 60 * 60 * 1000);
            const seasonalProb = this.getSeasonalAnomalyProbability(timestamp, seasonalAnomalies);
            results.push({
                timestamp,
                probability: Math.max(spikeProbability, seasonalProb),
                expectedValue: this.forecastValue(h),
                anomalyType: seasonalProb > spikeProbability ? 'seasonal' : 'spike',
            });
        }
        return results;
    }
    /**
     * Detect outbreak/spike patterns
     */
    detectOutbreaks() {
        const values = this.historicalData.map(d => d.value);
        const outbreaks = [];
        for (let i = this.windowSize; i < values.length; i++) {
            const window = values.slice(i - this.windowSize, i);
            const mean = this.mean(window);
            const std = this.std(window);
            const zScore = (values[i] - mean) / std;
            if (Math.abs(zScore) > this.threshold) {
                outbreaks.push({
                    timestamp: this.historicalData[i].timestamp,
                    index: i,
                    magnitude: Math.abs(values[i] - mean),
                    confidence: Math.min(0.99, Math.abs(zScore) / 10),
                });
            }
        }
        return outbreaks;
    }
    /**
     * Detect trend reversals
     */
    detectTrendReversals() {
        const values = this.historicalData.map(d => d.value);
        const reversals = [];
        for (let i = this.windowSize; i < values.length - this.windowSize; i++) {
            const before = values.slice(i - this.windowSize, i);
            const after = values.slice(i, i + this.windowSize);
            const trendBefore = this.calculateTrend(before);
            const trendAfter = this.calculateTrend(after);
            // Check for reversal (positive to negative or vice versa)
            if (trendBefore * trendAfter < 0) {
                reversals.push({
                    timestamp: this.historicalData[i].timestamp,
                    index: i,
                    magnitude: Math.abs(trendAfter - trendBefore),
                    confidence: 0.85,
                });
            }
        }
        return reversals;
    }
    /**
     * Forecast volatility
     */
    forecastVolatility(horizon) {
        const returns = this.calculateReturns();
        const volatility = this.calculateRollingVolatility(returns, this.windowSize);
        // Simple GARCH-like approach
        const lastVol = volatility[volatility.length - 1];
        const longTermVol = this.mean(volatility);
        const persistence = 0.9;
        const results = [];
        let currentVol = lastVol;
        for (let h = 1; h <= horizon; h++) {
            // Mean reversion
            currentVol = persistence * currentVol + (1 - persistence) * longTermVol;
            const timestamp = new Date(this.historicalData[this.historicalData.length - 1].timestamp.getTime() +
                h * 24 * 60 * 60 * 1000);
            results.push({
                timestamp,
                forecast: currentVol,
                lowerBound: currentVol * 0.8,
                upperBound: currentVol * 1.2,
                confidence: 0.90,
            });
        }
        return results;
    }
    /**
     * Calculate spike probability based on historical data
     */
    calculateSpikeProbability() {
        const values = this.historicalData.map(d => d.value);
        const mean = this.mean(values);
        const std = this.std(values);
        let spikes = 0;
        for (const value of values) {
            if (Math.abs(value - mean) > this.threshold * std) {
                spikes++;
            }
        }
        return spikes / values.length;
    }
    /**
     * Detect seasonal anomaly patterns
     */
    detectSeasonalAnomalies() {
        const anomaliesByDayOfWeek = new Map();
        for (let dow = 0; dow < 7; dow++) {
            const dayData = this.historicalData.filter(d => d.timestamp.getDay() === dow);
            if (dayData.length > 0) {
                const values = dayData.map(d => d.value);
                const mean = this.mean(values);
                const std = this.std(values);
                let anomalies = 0;
                for (const value of values) {
                    if (Math.abs(value - mean) > 2 * std) {
                        anomalies++;
                    }
                }
                anomaliesByDayOfWeek.set(dow, anomalies / values.length);
            }
        }
        return anomaliesByDayOfWeek;
    }
    /**
     * Get seasonal anomaly probability for timestamp
     */
    getSeasonalAnomalyProbability(timestamp, seasonalAnomalies) {
        const dayOfWeek = timestamp.getDay();
        return seasonalAnomalies.get(dayOfWeek) || 0;
    }
    /**
     * Forecast value using simple method
     */
    forecastValue(horizon) {
        const recentValues = this.historicalData
            .slice(-this.windowSize)
            .map(d => d.value);
        return this.mean(recentValues);
    }
    /**
     * Calculate returns
     */
    calculateReturns() {
        const values = this.historicalData.map(d => d.value);
        const returns = [];
        for (let i = 1; i < values.length; i++) {
            if (values[i - 1] !== 0) {
                returns.push((values[i] - values[i - 1]) / values[i - 1]);
            }
        }
        return returns;
    }
    /**
     * Calculate rolling volatility
     */
    calculateRollingVolatility(returns, window) {
        const volatility = [];
        for (let i = window; i < returns.length; i++) {
            const windowReturns = returns.slice(i - window, i);
            volatility.push(this.std(windowReturns));
        }
        return volatility;
    }
    /**
     * Calculate trend using linear regression
     */
    calculateTrend(values) {
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    std(arr) {
        const avg = this.mean(arr);
        const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
        return Math.sqrt(this.mean(squareDiffs));
    }
}
exports.AnomalyForecaster = AnomalyForecaster;
