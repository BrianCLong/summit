/**
 * StabilityAnalyzer - Analyzes system stability using Lyapunov-style methods
 *
 * Computes stability metrics including:
 * - Lyapunov exponent (divergence rate)
 * - Hurst exponent (long-range dependence)
 * - Approximate entropy (complexity)
 * - Detrended fluctuation analysis
 */

import { StabilityMetric } from '../models/SystemPhase.js';
import { TimeSeriesData } from '../TemporalFractureEngine.js';

export interface StabilityAnalyzerConfig {
  embeddingDimension: number;
  timeDelay: number;
}

export class StabilityAnalyzer {
  private config: StabilityAnalyzerConfig;

  constructor(config: StabilityAnalyzerConfig) {
    this.config = config;
  }

  /**
   * Analyze stability of time series
   */
  analyze(data: TimeSeriesData[]): StabilityMetric {
    if (data.length < 50) {
      // Not enough data for reliable analysis
      return {
        timestamp: new Date(),
        systemId: 'unknown',
        lyapunovExponent: 0,
        stabilityScore: 0.5,
        isStable: true,
      };
    }

    // Compute stability indicators
    const lyapunovExponent = this.computeLyapunovExponent(data);
    const hurstExponent = this.computeHurstExponent(data);
    const entropy = this.computeApproximateEntropy(data);

    // Aggregate into stability score
    const stabilityScore = this.computeStabilityScore({
      lyapunov: lyapunovExponent,
      hurst: hurstExponent,
      entropy,
    });

    // Predict time to instability
    const timeToInstability = this.predictInstabilityTime(
      lyapunovExponent,
      stabilityScore
    );

    return {
      timestamp: new Date(),
      systemId: 'unknown',
      lyapunovExponent,
      stabilityScore,
      hurstExponent,
      entropy,
      isStable: lyapunovExponent < 0 && stabilityScore > 0.7,
      timeToInstability,
    };
  }

  /**
   * Compute largest Lyapunov exponent
   *
   * Approximation using phase space reconstruction
   */
  private computeLyapunovExponent(data: TimeSeriesData[]): number {
    const embedding = this.reconstructPhaseSpace(data);

    if (embedding.length < 10) return 0;

    // Find nearest neighbors and track divergence
    const divergenceRates: number[] = [];

    for (let i = 0; i < embedding.length - 10; i++) {
      const point = embedding[i];

      // Find nearest neighbor
      let nearestIdx = -1;
      let minDistance = Infinity;

      for (let j = 0; j < embedding.length - 10; j++) {
        if (Math.abs(i - j) < 5) continue; // Skip temporally close points

        const distance = this.euclideanDistance(point, embedding[j]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIdx = j;
        }
      }

      if (nearestIdx === -1) continue;

      // Track divergence over next few steps
      let sumLogDivergence = 0;
      let count = 0;

      for (let k = 1; k <= 10 && i + k < embedding.length && nearestIdx + k < embedding.length; k++) {
        const dist = this.euclideanDistance(
          embedding[i + k],
          embedding[nearestIdx + k]
        );

        if (dist > 0) {
          sumLogDivergence += Math.log(dist / minDistance);
          count++;
        }
      }

      if (count > 0) {
        divergenceRates.push(sumLogDivergence / count);
      }
    }

    if (divergenceRates.length === 0) return 0;

    // Average divergence rate
    return (
      divergenceRates.reduce((sum, rate) => sum + rate, 0) /
      divergenceRates.length
    );
  }

  /**
   * Reconstruct phase space using time-delay embedding
   */
  private reconstructPhaseSpace(
    data: TimeSeriesData[]
  ): number[][] {
    const { embeddingDimension, timeDelay } = this.config;
    const embedding: number[][] = [];

    for (
      let i = 0;
      i < data.length - (embeddingDimension - 1) * timeDelay;
      i++
    ) {
      const point: number[] = [];
      for (let j = 0; j < embeddingDimension; j++) {
        point.push(data[i + j * timeDelay].value);
      }
      embedding.push(point);
    }

    return embedding;
  }

  /**
   * Compute Hurst exponent using R/S analysis
   *
   * H > 0.5: Persistent (trending)
   * H = 0.5: Random walk
   * H < 0.5: Anti-persistent (mean-reverting)
   */
  private computeHurstExponent(data: TimeSeriesData[]): number {
    const values = data.map((d) => d.value);
    const n = values.length;

    if (n < 20) return 0.5;

    // Compute mean
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    // Compute cumulative deviations
    const deviations: number[] = [];
    let cumSum = 0;

    for (let i = 0; i < n; i++) {
      cumSum += values[i] - mean;
      deviations.push(cumSum);
    }

    // Compute range
    const range = Math.max(...deviations) - Math.min(...deviations);

    // Compute standard deviation
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // R/S statistic
    const rs = stdDev !== 0 ? range / stdDev : 1;

    // Hurst exponent approximation
    const hurst = Math.log(rs) / Math.log(n / 2);

    return Math.max(0, Math.min(1, hurst));
  }

  /**
   * Compute approximate entropy
   *
   * Measures predictability/regularity of time series
   */
  private computeApproximateEntropy(data: TimeSeriesData[]): number {
    const values = data.map((d) => d.value);
    const m = 2; // Pattern length
    const r = 0.2 * this.standardDeviation(values); // Tolerance

    const apen = this.approximateEntropy(values, m, r);
    return apen;
  }

  /**
   * Approximate entropy calculation
   */
  private approximateEntropy(
    data: number[],
    m: number,
    r: number
  ): number {
    const n = data.length;

    if (n < m + 1) return 0;

    // Count patterns of length m
    const phi = (length: number): number => {
      const patterns: number[] = [];

      for (let i = 0; i <= n - length; i++) {
        let count = 0;

        for (let j = 0; j <= n - length; j++) {
          let match = true;

          for (let k = 0; k < length; k++) {
            if (Math.abs(data[i + k] - data[j + k]) > r) {
              match = false;
              break;
            }
          }

          if (match) count++;
        }

        patterns.push(count / (n - length + 1));
      }

      return (
        patterns.reduce((sum, p) => sum + Math.log(p), 0) / patterns.length
      );
    };

    return phi(m) - phi(m + 1);
  }

  /**
   * Compute stability score (0-1)
   */
  private computeStabilityScore(metrics: {
    lyapunov: number;
    hurst: number;
    entropy: number;
  }): number {
    // Lyapunov < 0 is stable, > 0 is unstable
    const lyapunovScore = Math.max(0, 1 - metrics.lyapunov);

    // Hurst close to 0.5 is more stable (random walk)
    const hurstScore = 1 - Math.abs(metrics.hurst - 0.5) * 2;

    // Lower entropy = more predictable = more stable
    const entropyScore = Math.max(0, 1 - metrics.entropy);

    // Weighted average
    return (
      lyapunovScore * 0.5 +
      hurstScore * 0.3 +
      entropyScore * 0.2
    );
  }

  /**
   * Predict time to instability (minutes)
   */
  private predictInstabilityTime(
    lyapunovExponent: number,
    stabilityScore: number
  ): number | undefined {
    if (lyapunovExponent < 0) {
      // Stable - no instability predicted
      return undefined;
    }

    // Exponential growth rate
    // Time for system to become unstable = 1 / lyapunovExponent
    const baseTime = lyapunovExponent > 0 ? 1 / lyapunovExponent : Infinity;

    // Adjust by stability score
    const adjustedTime = baseTime * stabilityScore;

    // Convert to minutes (assuming Lyapunov in per-minute units)
    return Math.min(adjustedTime * 60, 10000); // Cap at ~1 week
  }

  /**
   * Utility: Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }

  /**
   * Utility: Standard deviation
   */
  private standardDeviation(data: number[]): number {
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance =
      data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StabilityAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): StabilityAnalyzerConfig {
    return { ...this.config };
  }
}
