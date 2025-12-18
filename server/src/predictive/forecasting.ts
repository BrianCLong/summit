// Pure functions for forecasting
// Implementing simple Autoregressive (AR) and Exponential Smoothing

export const simpleMovingAverage = (data: number[], window: number): number[] => {
    if (data.length < window) return [];
    const result: number[] = [];
    for (let i = window; i <= data.length; i++) {
        const sum = data.slice(i - window, i).reduce((a, b) => a + b, 0);
        result.push(sum / window);
    }
    return result;
};

export const exponentialSmoothing = (data: number[], alpha: number): number[] => {
    if (data.length === 0) return [];
    const result = [data[0]]; // Initialize with first observation
    for (let i = 1; i < data.length; i++) {
        const st = alpha * data[i] + (1 - alpha) * result[i - 1];
        result.push(st);
    }
    return result;
};

// Simple linear regression for trend
export const linearTrendForecast = (data: number[], horizon: number): number[] => {
    const n = data.length;
    if (n < 2) return Array(horizon).fill(data[0] || 0);

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast: number[] = [];
    for (let i = 1; i <= horizon; i++) {
        const x = n - 1 + i;
        forecast.push(intercept + slope * x);
    }
    return forecast;
};

// Combine strategies
export const hybridForecast = (data: number[], horizon: number): { point: number, lower: number, upper: number }[] => {
    // Detect trend
    const trend = linearTrendForecast(data, horizon);

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
