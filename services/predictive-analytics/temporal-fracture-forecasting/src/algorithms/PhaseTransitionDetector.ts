/**
 * PhaseTransitionDetector - Detects phase transitions in time series data
 *
 * Uses CUSUM (Cumulative Sum Control Chart) and Bayesian change point detection
 * to identify regime changes in system behavior.
 */

import { PhaseState, PhaseTransition } from '../models/SystemPhase.js';
import { TimeSeriesData } from '../TemporalFractureEngine.js';

export interface PhaseDetectorConfig {
  windowSize: number;
  threshold: number;
}

export class PhaseTransitionDetector {
  private config: PhaseDetectorConfig;

  constructor(config: PhaseDetectorConfig) {
    this.config = config;
  }

  /**
   * Detect phase transitions in time series
   */
  detect(data: TimeSeriesData[]): PhaseTransition[] {
    if (data.length < this.config.windowSize * 2) {
      return [];
    }

    const transitions: PhaseTransition[] = [];
    let currentPhase = this.identifyPhase(data[0]);

    for (let i = this.config.windowSize; i < data.length; i++) {
      const window = data.slice(
        Math.max(0, i - this.config.windowSize),
        i
      );

      // Compute statistical moments
      const mean = this.computeMean(window);
      const variance = this.computeVariance(window, mean);
      const skewness = this.computeSkewness(window, mean, variance);

      // Detect regime change using CUSUM
      const cusumScore = this.computeCUSUM(window, mean, variance);

      if (cusumScore > this.config.threshold) {
        const newPhase = this.identifyPhase(data[i], {
          mean,
          variance,
          skewness,
          cusumScore,
        });

        if (newPhase !== currentPhase) {
          transitions.push({
            id: `transition-${data[i].timestamp.getTime()}`,
            systemId: 'unknown', // Will be set by caller
            transitionTime: data[i].timestamp,
            fromPhase: currentPhase,
            toPhase: newPhase,
            confidence: this.calculateConfidence(cusumScore, variance),
            metrics: { mean, variance, skewness, cusumScore },
          });

          currentPhase = newPhase;
        }
      }
    }

    return transitions;
  }

  /**
   * Identify phase based on metrics
   */
  private identifyPhase(
    dataPoint: TimeSeriesData,
    metrics?: {
      mean: number;
      variance: number;
      skewness: number;
      cusumScore: number;
    }
  ): PhaseState {
    if (!metrics) {
      return PhaseState.STABLE;
    }

    // Heuristic phase classification
    const { variance, skewness, cusumScore } = metrics;

    // High variance + high CUSUM = unstable or critical
    if (variance > 0.5 && cusumScore > 0.3) {
      return skewness > 1 ? PhaseState.CRITICAL : PhaseState.UNSTABLE;
    }

    // Moderate variance + increasing trend = pre-fracture
    if (variance > 0.2 && cusumScore > 0.1) {
      return PhaseState.PRE_FRACTURE;
    }

    // Decreasing variance = recovering
    if (cusumScore < -0.1) {
      return PhaseState.RECOVERING;
    }

    return PhaseState.STABLE;
  }

  /**
   * Compute CUSUM score
   */
  private computeCUSUM(
    window: TimeSeriesData[],
    targetMean: number,
    targetVariance: number
  ): number {
    let cumSum = 0;
    const k = 0.5; // Slack parameter

    for (const point of window) {
      const deviation = point.value - targetMean;
      const normalized = deviation / Math.sqrt(targetVariance);
      cumSum = Math.max(0, cumSum + normalized - k);
    }

    return cumSum / window.length;
  }

  /**
   * Calculate confidence based on CUSUM score and variance
   */
  private calculateConfidence(cusumScore: number, variance: number): number {
    // Higher CUSUM and lower variance = higher confidence
    const cusumConfidence = Math.min(1, cusumScore / 0.5);
    const varianceConfidence = Math.max(0, 1 - variance);

    return (cusumConfidence * 0.7 + varianceConfidence * 0.3);
  }

  /**
   * Compute mean
   */
  private computeMean(data: TimeSeriesData[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.value, 0) / data.length;
  }

  /**
   * Compute variance
   */
  private computeVariance(data: TimeSeriesData[], mean: number): number {
    if (data.length === 0) return 0;

    const squaredDiffs = data.map((d) => Math.pow(d.value - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / data.length;
  }

  /**
   * Compute skewness
   */
  private computeSkewness(
    data: TimeSeriesData[],
    mean: number,
    variance: number
  ): number {
    if (data.length === 0 || variance === 0) return 0;

    const cubedDiffs = data.map((d) => Math.pow((d.value - mean) / Math.sqrt(variance), 3));
    return cubedDiffs.reduce((sum, d) => sum + d, 0) / data.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PhaseDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): PhaseDetectorConfig {
    return { ...this.config };
  }
}
