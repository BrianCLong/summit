/**
 * Monte Carlo Simulation Framework
 *
 * Runs multiple simulation instances to characterize uncertainty
 */

import { Scenario } from '../index.js';
import { AgentBasedSimulator, SimulationConfig, SimulationResult } from './agent-based-simulator.js';

export interface MonteCarloConfig {
  iterations: number;
  simulationConfig: SimulationConfig;
  parallelism?: number;
}

export interface MonteCarloResult {
  scenario: Scenario;
  iterations: number;
  statistics: SimulationStatistics;
  distribution: DistributionSummary;
  confidenceIntervals: ConfidenceIntervals;
  outliers: SimulationResult[];
}

export interface SimulationStatistics {
  meanActivationRate: number;
  stdActivationRate: number;
  cascadeProbability: number;
  meanPeakActive: number;
  meanTimeToaPeak: number;
}

export interface DistributionSummary {
  activationRates: number[];
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
}

export interface ConfidenceIntervals {
  activationRate: { lower: number; upper: number };
  cascadeProbability: { lower: number; upper: number };
}

/**
 * Monte Carlo Runner
 */
export class MonteCarloRunner {
  private config: MonteCarloConfig;

  constructor(config: MonteCarloConfig) {
    this.config = config;
  }

  /**
   * Run Monte Carlo simulation
   */
  async run(
    scenario: Scenario,
    initializer: (sim: AgentBasedSimulator) => void
  ): Promise<MonteCarloResult> {
    const results: SimulationResult[] = [];

    for (let i = 0; i < this.config.iterations; i++) {
      const simulator = new AgentBasedSimulator({
        ...this.config.simulationConfig,
        seed: i + 1, // Different seed for each run
      });

      initializer(simulator);
      const result = simulator.run(scenario);
      results.push(result);
    }

    return this.analyzeResults(scenario, results);
  }

  private analyzeResults(scenario: Scenario, results: SimulationResult[]): MonteCarloResult {
    const activationRates = results.map((r) => r.summary.activationRate);
    const cascadeOccurrences = results.filter((r) => r.summary.cascadeOccurred).length;
    const peakActives = results.map((r) => r.summary.peakActive);

    // Calculate statistics
    const meanActivationRate = mean(activationRates);
    const stdActivationRate = std(activationRates);
    const cascadeProbability = cascadeOccurrences / results.length;

    // Calculate percentiles
    const sortedRates = [...activationRates].sort((a, b) => a - b);
    const percentiles = {
      p5: percentile(sortedRates, 0.05),
      p25: percentile(sortedRates, 0.25),
      p50: percentile(sortedRates, 0.5),
      p75: percentile(sortedRates, 0.75),
      p95: percentile(sortedRates, 0.95),
    };

    // Confidence intervals (95%)
    const activationCI = confidenceInterval(activationRates, 0.95);
    const cascadeCI = wilsonScoreInterval(cascadeOccurrences, results.length, 0.95);

    // Identify outliers
    const outlierThreshold = meanActivationRate + 2 * stdActivationRate;
    const outliers = results.filter((r) => r.summary.activationRate > outlierThreshold);

    return {
      scenario,
      iterations: this.config.iterations,
      statistics: {
        meanActivationRate,
        stdActivationRate,
        cascadeProbability,
        meanPeakActive: mean(peakActives),
        meanTimeToaPeak: 0, // Would need trajectory analysis
      },
      distribution: {
        activationRates: sortedRates,
        percentiles,
      },
      confidenceIntervals: {
        activationRate: activationCI,
        cascadeProbability: cascadeCI,
      },
      outliers,
    };
  }
}

// Statistical helper functions
function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function confidenceInterval(values: number[], confidence: number): { lower: number; upper: number } {
  const m = mean(values);
  const se = std(values) / Math.sqrt(values.length);
  const z = 1.96; // 95% CI
  return {
    lower: m - z * se,
    upper: m + z * se,
  };
}

function wilsonScoreInterval(
  successes: number,
  trials: number,
  confidence: number
): { lower: number; upper: number } {
  const p = successes / trials;
  const z = 1.96;
  const denominator = 1 + z ** 2 / trials;
  const center = p + z ** 2 / (2 * trials);
  const spread = z * Math.sqrt(p * (1 - p) / trials + z ** 2 / (4 * trials ** 2));

  return {
    lower: Math.max(0, (center - spread) / denominator),
    upper: Math.min(1, (center + spread) / denominator),
  };
}
