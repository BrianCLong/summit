/**
 * Scenario Analysis and Monte Carlo Simulation
 */

import type { TimeSeriesData, ForecastResult } from '../types/index.js';

export interface ScenarioConfig {
  name: string;
  assumptions: Map<string, number>;
  probability?: number;
}

export interface SimulationResult {
  scenarios: Array<{
    name: string;
    forecasts: ForecastResult[];
    probability: number;
  }>;
  percentiles: Map<number, ForecastResult[]>;
  mean: ForecastResult[];
  median: ForecastResult[];
}

export class MonteCarloSimulator {
  private iterations: number;
  private seed?: number;

  constructor(iterations: number = 1000, seed?: number) {
    this.iterations = iterations;
    this.seed = seed;
  }

  /**
   * Run Monte Carlo simulation
   */
  simulate(
    baseForecasts: ForecastResult[],
    volatility: number,
    drift: number = 0
  ): SimulationResult {
    const allPaths: ForecastResult[][] = [];

    for (let i = 0; i < this.iterations; i++) {
      const path = this.generatePath(baseForecasts, volatility, drift);
      allPaths.push(path);
    }

    // Calculate percentiles
    const percentiles = new Map<number, ForecastResult[]>();
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
      median: percentiles.get(50)!,
    };
  }

  /**
   * Generate a simulated path
   */
  private generatePath(
    baseForecasts: ForecastResult[],
    volatility: number,
    drift: number
  ): ForecastResult[] {
    const path: ForecastResult[] = [];

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
  private calculatePercentile(
    paths: ForecastResult[][],
    percentile: number
  ): ForecastResult[] {
    const n = paths[0].length;
    const result: ForecastResult[] = [];

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
  private calculateMean(paths: ForecastResult[][]): ForecastResult[] {
    const n = paths[0].length;
    const result: ForecastResult[] = [];

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
  private randomNormal(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * std + mean;
  }
}

/**
 * Scenario Analysis
 */
export class ScenarioAnalyzer {
  /**
   * Compare multiple scenarios
   */
  compareScenarios(scenarios: ScenarioConfig[]): Array<{
    scenario: ScenarioConfig;
    impact: number;
    ranking: number;
  }> {
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
  sensitivityAnalysis(
    baseValue: number,
    parameters: Map<string, number[]>
  ): Map<string, number[]> {
    const results = new Map<string, number[]>();

    for (const [param, values] of parameters.entries()) {
      const impacts = values.map(v => this.calculateParameterImpact(baseValue, v));
      results.set(param, impacts);
    }

    return results;
  }

  /**
   * Stress testing
   */
  stressTest(
    baseForecasts: ForecastResult[],
    stressFactors: Map<string, number>
  ): ForecastResult[] {
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
  whatIf(
    baseForecasts: ForecastResult[],
    changePoint: number,
    changeMultiplier: number
  ): ForecastResult[] {
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

  private calculateImpact(scenario: ScenarioConfig): number {
    let impact = 0;
    for (const [_, value] of scenario.assumptions.entries()) {
      impact += Math.abs(value - 1);
    }
    return impact / scenario.assumptions.size;
  }

  private calculateParameterImpact(baseValue: number, paramValue: number): number {
    return (paramValue - baseValue) / baseValue;
  }
}

/**
 * Backtesting Framework
 */
export class Backtester {
  /**
   * Backtest a forecasting model
   */
  backtest(
    data: TimeSeriesData[],
    forecastFunction: (trainData: TimeSeriesData[], horizon: number) => ForecastResult[],
    horizon: number,
    windowSize: number
  ): {
    accuracy: number;
    forecasts: ForecastResult[];
    actuals: number[];
    errors: number[];
  } {
    const forecasts: ForecastResult[] = [];
    const actuals: number[] = [];
    const errors: number[] = [];

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

  private calculateAccuracy(predicted: number[], actual: number[]): number {
    let correct = 0;
    for (let i = 0; i < predicted.length; i++) {
      const error = Math.abs(predicted[i] - actual[i]) / actual[i];
      if (error < 0.1) correct++; // Within 10%
    }
    return correct / predicted.length;
  }
}
