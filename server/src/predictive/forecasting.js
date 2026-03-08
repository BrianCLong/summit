"use strict";
// Pure functions for forecasting
// Implementing simple Autoregressive (AR) and Exponential Smoothing
Object.defineProperty(exports, "__esModule", { value: true });
exports.hybridForecast = exports.linearTrendForecast = exports.exponentialSmoothing = exports.simpleMovingAverage = void 0;
const simpleMovingAverage = (data, window) => {
    if (data.length < window)
        return [];
    const result = [];
    for (let i = window; i <= data.length; i++) {
        const sum = data.slice(i - window, i).reduce((a, b) => a + b, 0);
        result.push(sum / window);
    }
    return result;
};
exports.simpleMovingAverage = simpleMovingAverage;
const exponentialSmoothing = (data, alpha) => {
    if (data.length === 0)
        return [];
    const result = [data[0]]; // Initialize with first observation
    for (let i = 1; i < data.length; i++) {
        const st = alpha * data[i] + (1 - alpha) * result[i - 1];
        result.push(st);
    }
    return result;
};
exports.exponentialSmoothing = exponentialSmoothing;
// Simple linear regression for trend
const linearTrendForecast = (data, horizon) => {
    const n = data.length;
    if (n < 2)
        return Array(horizon).fill(data[0] || 0);
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const forecast = [];
    for (let i = 1; i <= horizon; i++) {
        const x = n - 1 + i;
        forecast.push(intercept + slope * x);
    }
    return forecast;
};
exports.linearTrendForecast = linearTrendForecast;
// Combine strategies
const hybridForecast = (data, horizon) => {
    // Detect trend
    const trend = (0, exports.linearTrendForecast)(data, horizon);
    // Simple volatility measure for confidence intervals
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    return trend.map(val => ({
        point: val,
        lower: val - 1.96 * stdDev, // 95% CI roughly
        upper: val + 1.96 * stdDev
    }));
};
exports.hybridForecast = hybridForecast;
