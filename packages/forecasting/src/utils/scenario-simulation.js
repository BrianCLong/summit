"use strict";
/**
 * Scenario Analysis and Monte Carlo Simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Backtester = exports.ScenarioAnalyzer = exports.MonteCarloSimulator = void 0;
class MonteCarloSimulator {
    iterations;
    seed;
    constructor(iterations = 1000, seed) {
        this.iterations = iterations;
        this.seed = seed;
    }
    /**
     * Run Monte Carlo simulation
     */
    simulate(baseForecasts, volatility, drift = 0) {
        const allPaths = [];
        for (let i = 0; i < this.iterations; i++) {
            const path = this.generatePath(baseForecasts, volatility, drift);
            allPaths.push(path);
        }
        // Calculate percentiles
        const percentiles = new Map();
        [5, 25, 50, 75, 95].forEach(p => {
            percentiles.set(p, this.calculatePercentile(allPaths, p));
        });
        return {
            scenarios: [{
                    name: 'Monte Carlo',
                    forecasts: baseForecasts,
                    probability: 1.0,
                }],
            percentiles,
            mean: this.calculateMean(allPaths),
            median: percentiles.get(50),
        };
    }
    /**
     * Generate a simulated path
     */
    generatePath(baseForecasts, volatility, drift) {
        const path = [];
        for (let i = 0; i < baseForecasts.length; i++) {
            const shock = this.randomNormal(0, volatility);
            const forecast = baseForecasts[i].forecast * (1 + drift + shock);
            path.push({
                timestamp: baseForecasts[i].timestamp,
                forecast,
                lowerBound: forecast * 0.9,
                upperBound: forecast * 1.1,
                confidence: baseForecasts[i].confidence,
            });
        }
        return path;
    }
    /**
     * Calculate percentile across all paths
     */
    calculatePercentile(paths, percentile) {
        const n = paths[0].length;
        const result = [];
        for (let i = 0; i < n; i++) {
            const values = paths.map(p => p[i].forecast).sort((a, b) => a - b);
            const index = Math.floor(values.length * percentile / 100);
            result.push({
                timestamp: paths[0][i].timestamp,
                forecast: values[index],
                lowerBound: values[Math.floor(index * 0.9)],
                upperBound: values[Math.ceil(index * 1.1)],
                confidence: percentile / 100,
            });
        }
        return result;
    }
    /**
     * Calculate mean across all paths
     */
    calculateMean(paths) {
        const n = paths[0].length;
        const result = [];
        for (let i = 0; i < n; i++) {
            const values = paths.map(p => p[i].forecast);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            result.push({
                timestamp: paths[0][i].timestamp,
                forecast: mean,
                lowerBound: mean * 0.9,
                upperBound: mean * 1.1,
                confidence: 0.95,
            });
        }
        return result;
    }
    /**
     * Generate random normal value (Box-Muller transform)
     */
    randomNormal(mean, std) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * std + mean;
    }
}
exports.MonteCarloSimulator = MonteCarloSimulator;
/**
 * Scenario Analysis
 */
class ScenarioAnalyzer {
    /**
     * Compare multiple scenarios
     */
    compareScenarios(scenarios) {
        const results = scenarios.map(scenario => ({
            scenario,
            impact: this.calculateImpact(scenario),
            ranking: 0,
        }));
        // Rank by impact
        results.sort((a, b) => b.impact - a.impact);
        results.forEach((r, i) => r.ranking = i + 1);
        return results;
    }
    /**
     * Perform sensitivity analysis
     */
    sensitivityAnalysis(baseValue, parameters) {
        const results = new Map();
        for (const [param, values] of parameters.entries()) {
            const impacts = values.map(v => this.calculateParameterImpact(baseValue, v));
            results.set(param, impacts);
        }
        return results;
    }
    /**
     * Stress testing
     */
    stressTest(baseForecasts, stressFactors) {
        return baseForecasts.map(forecast => {
            let stressedValue = forecast.forecast;
            for (const [factor, multiplier] of stressFactors.entries()) {
                stressedValue *= multiplier;
            }
            return {
                timestamp: forecast.timestamp,
                forecast: stressedValue,
                lowerBound: stressedValue * 0.8,
                upperBound: stressedValue * 1.2,
                confidence: forecast.confidence * 0.9,
            };
        });
    }
    /**
     * What-if analysis
     */
    whatIf(baseForecasts, changePoint, changeMultiplier) {
        return baseForecasts.map((forecast, i) => {
            const multiplier = i >= changePoint ? changeMultiplier : 1.0;
            return {
                timestamp: forecast.timestamp,
                forecast: forecast.forecast * multiplier,
                lowerBound: forecast.lowerBound * multiplier,
                upperBound: forecast.upperBound * multiplier,
                confidence: forecast.confidence,
            };
        });
    }
    calculateImpact(scenario) {
        let impact = 0;
        for (const [_, value] of scenario.assumptions.entries()) {
            impact += Math.abs(value - 1);
        }
        return impact / scenario.assumptions.size;
    }
    calculateParameterImpact(baseValue, paramValue) {
        return (paramValue - baseValue) / baseValue;
    }
}
exports.ScenarioAnalyzer = ScenarioAnalyzer;
/**
 * Backtesting Framework
 */
class Backtester {
    /**
     * Backtest a forecasting model
     */
    backtest(data, forecastFunction, horizon, windowSize) {
        const forecasts = [];
        const actuals = [];
        const errors = [];
        for (let i = windowSize; i < data.length - horizon; i += horizon) {
            const trainData = data.slice(0, i);
            const testData = data.slice(i, i + horizon);
            const predictions = forecastFunction(trainData, horizon);
            for (let j = 0; j < predictions.length && j < testData.length; j++) {
                forecasts.push(predictions[j]);
                actuals.push(testData[j].value);
                errors.push(predictions[j].forecast - testData[j].value);
            }
        }
        const accuracy = this.calculateAccuracy(forecasts.map(f => f.forecast), actuals);
        return { accuracy, forecasts, actuals, errors };
    }
    calculateAccuracy(predicted, actual) {
        let correct = 0;
        for (let i = 0; i < predicted.length; i++) {
            const error = Math.abs(predicted[i] - actual[i]) / actual[i];
            if (error < 0.1)
                correct++; // Within 10%
        }
        return correct / predicted.length;
    }
}
exports.Backtester = Backtester;
