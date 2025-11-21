/**
 * Phase Transition Detection
 *
 * Identifies critical transitions in collective behavior using
 * statistical physics and complexity science approaches.
 */

import { PhaseTransitionIndicator, TransitionType, EarlyWarningSignal } from '../index.js';

export interface PhaseTransitionConfig {
  windowSize: number;
  sensitivityThreshold: number;
  earlyWarningLead: number;
}

/**
 * Phase Transition Detector
 *
 * Uses early warning signals (critical slowing down) to predict
 * impending phase transitions in social systems.
 */
export class PhaseTransitionDetector {
  private config: PhaseTransitionConfig;

  constructor(config: PhaseTransitionConfig) {
    this.config = config;
  }

  /**
   * Detect early warning signals of critical transitions
   *
   * Based on "critical slowing down" - systems approaching
   * critical points show:
   * 1. Increased autocorrelation
   * 2. Increased variance
   * 3. Flickering between states
   */
  detectEarlyWarnings(timeSeries: number[]): EarlyWarningSignal[] {
    const signals: EarlyWarningSignal[] = [];

    // Calculate autocorrelation at lag 1
    const autocorr = this.calculateAutocorrelation(timeSeries, 1);
    signals.push({
      signal: 'AUTOCORRELATION',
      value: autocorr,
      threshold: 0.7,
      trend: this.calculateTrend(timeSeries, (ts) => this.calculateAutocorrelation(ts, 1)),
      significance: autocorr > 0.7 ? 0.9 : autocorr > 0.5 ? 0.6 : 0.3,
    });

    // Calculate variance
    const variance = this.calculateVariance(timeSeries);
    const varianceTrend = this.calculateTrend(timeSeries, this.calculateVariance.bind(this));
    signals.push({
      signal: 'VARIANCE',
      value: variance,
      threshold: 0, // Context-dependent
      trend: varianceTrend,
      significance: varianceTrend > 0.1 ? 0.8 : varianceTrend > 0 ? 0.5 : 0.2,
    });

    // Calculate skewness (asymmetry indicating approach to boundary)
    const skewness = this.calculateSkewness(timeSeries);
    signals.push({
      signal: 'SKEWNESS',
      value: skewness,
      threshold: 1,
      trend: this.calculateTrend(timeSeries, this.calculateSkewness.bind(this)),
      significance: Math.abs(skewness) > 1 ? 0.7 : 0.3,
    });

    // Detect flickering (bimodality)
    const flickering = this.detectFlickering(timeSeries);
    signals.push({
      signal: 'FLICKERING',
      value: flickering,
      threshold: 0.5,
      trend: 0,
      significance: flickering > 0.5 ? 0.85 : 0.2,
    });

    return signals;
  }

  /**
   * Estimate distance to critical transition
   */
  estimateDistanceToTransition(
    signals: EarlyWarningSignal[]
  ): { distance: number; confidence: number } {
    // Weighted combination of signal strengths
    let totalWeight = 0;
    let weightedDistance = 0;

    for (const signal of signals) {
      const weight = signal.significance;
      const signalDistance = signal.threshold > 0
        ? 1 - signal.value / signal.threshold
        : 1 - Math.tanh(signal.trend);

      totalWeight += weight;
      weightedDistance += weight * signalDistance;
    }

    const distance = totalWeight > 0 ? weightedDistance / totalWeight : 1;

    // Confidence based on agreement between signals
    const confidences = signals.map((s) => s.significance);
    const meanConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    return {
      distance: Math.max(0, Math.min(1, distance)),
      confidence: meanConfidence,
    };
  }

  /**
   * Classify type of impending transition
   */
  classifyTransition(
    signals: EarlyWarningSignal[],
    contextIndicators: ContextIndicator[]
  ): TransitionType {
    // Use signal patterns and context to classify
    const hasHighAutocorr = signals.find(
      (s) => s.signal === 'AUTOCORRELATION' && s.value > 0.7
    );
    const hasFlickering = signals.find(
      (s) => s.signal === 'FLICKERING' && s.value > 0.5
    );
    const hasTrustIndicators = contextIndicators.some(
      (c) => c.type === 'INSTITUTIONAL_TRUST' && c.value < 0.3
    );
    const hasMobilizationIndicators = contextIndicators.some(
      (c) => c.type === 'MOBILIZATION_ACTIVITY'
    );

    if (hasMobilizationIndicators && hasHighAutocorr) {
      return 'MASS_MOBILIZATION';
    }
    if (hasTrustIndicators && hasFlickering) {
      return 'TRUST_COLLAPSE';
    }
    if (hasFlickering) {
      return 'OPINION_SHIFT';
    }

    return 'OPINION_SHIFT';
  }

  private calculateAutocorrelation(series: number[], lag: number): number {
    const n = series.length;
    if (n <= lag) return 0;

    const mean = series.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (series[i] - mean) * (series[i + lag] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += (series[i] - mean) ** 2;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVariance(series: number[]): number {
    const n = series.length;
    const mean = series.reduce((a, b) => a + b, 0) / n;
    return series.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  }

  private calculateSkewness(series: number[]): number {
    const n = series.length;
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const variance = this.calculateVariance(series);
    const std = Math.sqrt(variance);

    if (std === 0) return 0;

    const m3 = series.reduce((sum, x) => sum + ((x - mean) / std) ** 3, 0) / n;
    return m3;
  }

  private calculateTrend(
    series: number[],
    statFn: (s: number[]) => number
  ): number {
    const windowSize = Math.floor(series.length / 4);
    if (windowSize < 2) return 0;

    const stats: number[] = [];
    for (let i = 0; i <= series.length - windowSize; i += windowSize) {
      const window = series.slice(i, i + windowSize);
      stats.push(statFn(window));
    }

    if (stats.length < 2) return 0;

    // Simple slope
    const slope = (stats[stats.length - 1] - stats[0]) / stats.length;
    return slope;
  }

  private detectFlickering(series: number[]): number {
    // Detect bimodality using peaks in histogram
    const bins = 20;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const histogram = new Array(bins).fill(0);

    for (const x of series) {
      const bin = Math.min(bins - 1, Math.floor(((x - min) / range) * bins));
      histogram[bin]++;
    }

    // Count local maxima
    let peaks = 0;
    for (let i = 1; i < bins - 1; i++) {
      if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1]) {
        peaks++;
      }
    }

    return peaks >= 2 ? 0.8 : peaks === 1 ? 0.2 : 0;
  }
}

export interface ContextIndicator {
  type: string;
  value: number;
}
