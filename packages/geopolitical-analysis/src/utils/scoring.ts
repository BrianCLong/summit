/**
 * Utility functions for risk scoring and calculations
 * @module @summit/geopolitical-analysis/utils/scoring
 */

import { RiskLevel, ConfidenceLevel } from '../types/index.js';

/**
 * Convert a numeric score (0-100) to a RiskLevel
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score < 0 || score > 100) {
    throw new Error(`Score must be between 0 and 100, got ${score}`);
  }

  if (score >= 76) return RiskLevel.CRITICAL;
  if (score >= 51) return RiskLevel.HIGH;
  if (score >= 26) return RiskLevel.MODERATE;
  return RiskLevel.LOW;
}

/**
 * Calculate weighted average of multiple scores
 */
export function weightedAverage(
  scores: Array<{ value: number; weight: number }>
): number {
  if (scores.length === 0) {
    throw new Error('Cannot calculate weighted average of empty array');
  }

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) {
    throw new Error('Total weight cannot be zero');
  }

  const weightedSum = scores.reduce(
    (sum, s) => sum + s.value * s.weight,
    0
  );

  return weightedSum / totalWeight;
}

/**
 * Normalize a value to 0-100 scale
 */
export function normalize(
  value: number,
  min: number,
  max: number,
  inverse = false
): number {
  if (min >= max) {
    throw new Error(`min (${min}) must be less than max (${max})`);
  }

  const clamped = Math.max(min, Math.min(max, value));
  const normalized = ((clamped - min) / (max - min)) * 100;

  return inverse ? 100 - normalized : normalized;
}

/**
 * Calculate confidence level based on data quality metrics
 */
export function calculateConfidence(metrics: {
  dataRecency: number; // days since data collected
  sourceReliability: number; // 0-100
  dataCompleteness: number; // 0-100
  expertConsensus: number; // 0-100
}): ConfidenceLevel {
  const { dataRecency, sourceReliability, dataCompleteness, expertConsensus } =
    metrics;

  // Penalize old data
  const recencyScore = normalize(dataRecency, 0, 365, true);

  // Calculate overall confidence
  const confidenceScore = weightedAverage([
    { value: recencyScore, weight: 0.2 },
    { value: sourceReliability, weight: 0.3 },
    { value: dataCompleteness, weight: 0.25 },
    { value: expertConsensus, weight: 0.25 },
  ]);

  if (confidenceScore >= 85) return ConfidenceLevel.VERY_HIGH;
  if (confidenceScore >= 70) return ConfidenceLevel.HIGH;
  if (confidenceScore >= 50) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * Apply exponential decay to a time series value
 */
export function exponentialDecay(
  initialValue: number,
  halfLife: number,
  timeElapsed: number
): number {
  return initialValue * Math.pow(0.5, timeElapsed / halfLife);
}

/**
 * Calculate moving average
 */
export function movingAverage(values: number[], window: number): number[] {
  if (window > values.length) {
    throw new Error('Window size cannot be larger than array length');
  }

  const result: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    const windowValues = values.slice(i, i + window);
    const avg = windowValues.reduce((sum, v) => sum + v, 0) / window;
    result.push(avg);
  }

  return result;
}

/**
 * Calculate rate of change (percentage)
 */
export function rateOfChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : Infinity;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Z-score normalization
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) {
    throw new Error('Standard deviation cannot be zero');
  }
  return (value - mean) / stdDev;
}

/**
 * Calculate percentile rank
 */
export function percentileRank(value: number, dataset: number[]): number {
  if (dataset.length === 0) {
    throw new Error('Dataset cannot be empty');
  }

  const sorted = [...dataset].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);

  if (index === -1) {
    return 100;
  }

  return (index / sorted.length) * 100;
}

/**
 * Calculate compound annual growth rate (CAGR)
 */
export function calculateCAGR(
  beginValue: number,
  endValue: number,
  years: number
): number {
  if (beginValue <= 0 || endValue <= 0) {
    throw new Error('Values must be positive for CAGR calculation');
  }
  if (years <= 0) {
    throw new Error('Years must be positive');
  }

  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

/**
 * Detect trend direction
 */
export function detectTrend(
  values: number[]
): 'RISING' | 'STABLE' | 'DECLINING' {
  if (values.length < 2) {
    return 'STABLE';
  }

  // Simple linear regression slope
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, v) => sum + v, 0);
  const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Threshold for determining significance
  const avgValue = sumY / n;
  const significanceThreshold = avgValue * 0.01; // 1% of average

  if (Math.abs(slope) < significanceThreshold) {
    return 'STABLE';
  }

  return slope > 0 ? 'RISING' : 'DECLINING';
}
