/**
 * Tests for scoring utilities
 */

import {
  scoreToRiskLevel,
  weightedAverage,
  normalize,
  calculateConfidence,
  detectTrend,
  calculateCAGR,
} from '../src/utils/scoring';
import { RiskLevel, ConfidenceLevel } from '../src/types';

describe('scoreToRiskLevel', () => {
  it('should return LOW for scores 0-25', () => {
    expect(scoreToRiskLevel(0)).toBe(RiskLevel.LOW);
    expect(scoreToRiskLevel(25)).toBe(RiskLevel.LOW);
  });

  it('should return MODERATE for scores 26-50', () => {
    expect(scoreToRiskLevel(26)).toBe(RiskLevel.MODERATE);
    expect(scoreToRiskLevel(50)).toBe(RiskLevel.MODERATE);
  });

  it('should return HIGH for scores 51-75', () => {
    expect(scoreToRiskLevel(51)).toBe(RiskLevel.HIGH);
    expect(scoreToRiskLevel(75)).toBe(RiskLevel.HIGH);
  });

  it('should return CRITICAL for scores 76-100', () => {
    expect(scoreToRiskLevel(76)).toBe(RiskLevel.CRITICAL);
    expect(scoreToRiskLevel(100)).toBe(RiskLevel.CRITICAL);
  });

  it('should throw error for scores out of range', () => {
    expect(() => scoreToRiskLevel(-1)).toThrow();
    expect(() => scoreToRiskLevel(101)).toThrow();
  });
});

describe('weightedAverage', () => {
  it('should calculate weighted average correctly', () => {
    const scores = [
      { value: 100, weight: 0.5 },
      { value: 0, weight: 0.5 },
    ];
    expect(weightedAverage(scores)).toBe(50);
  });

  it('should handle unequal weights', () => {
    const scores = [
      { value: 100, weight: 0.75 },
      { value: 0, weight: 0.25 },
    ];
    expect(weightedAverage(scores)).toBe(75);
  });

  it('should throw error for empty array', () => {
    expect(() => weightedAverage([])).toThrow();
  });

  it('should throw error for zero total weight', () => {
    const scores = [
      { value: 100, weight: 0 },
      { value: 50, weight: 0 },
    ];
    expect(() => weightedAverage(scores)).toThrow();
  });
});

describe('normalize', () => {
  it('should normalize value to 0-100 scale', () => {
    expect(normalize(50, 0, 100, false)).toBe(50);
    expect(normalize(25, 0, 100, false)).toBe(25);
    expect(normalize(75, 0, 100, false)).toBe(75);
  });

  it('should handle inverse normalization', () => {
    expect(normalize(50, 0, 100, true)).toBe(50);
    expect(normalize(0, 0, 100, true)).toBe(100);
    expect(normalize(100, 0, 100, true)).toBe(0);
  });

  it('should clamp values outside range', () => {
    expect(normalize(-10, 0, 100, false)).toBe(0);
    expect(normalize(110, 0, 100, false)).toBe(100);
  });

  it('should throw error if min >= max', () => {
    expect(() => normalize(50, 100, 0, false)).toThrow();
    expect(() => normalize(50, 50, 50, false)).toThrow();
  });
});

describe('calculateConfidence', () => {
  it('should return VERY_HIGH for excellent metrics', () => {
    const confidence = calculateConfidence({
      dataRecency: 1,
      sourceReliability: 95,
      dataCompleteness: 100,
      expertConsensus: 90,
    });
    expect(confidence).toBe(ConfidenceLevel.VERY_HIGH);
  });

  it('should return LOW for poor metrics', () => {
    const confidence = calculateConfidence({
      dataRecency: 365,
      sourceReliability: 30,
      dataCompleteness: 40,
      expertConsensus: 35,
    });
    expect(confidence).toBe(ConfidenceLevel.LOW);
  });

  it('should penalize old data', () => {
    const recent = calculateConfidence({
      dataRecency: 1,
      sourceReliability: 70,
      dataCompleteness: 70,
      expertConsensus: 70,
    });

    const old = calculateConfidence({
      dataRecency: 300,
      sourceReliability: 70,
      dataCompleteness: 70,
      expertConsensus: 70,
    });

    // Recent data should have higher confidence
    expect(recent).not.toBe(old);
  });
});

describe('detectTrend', () => {
  it('should detect rising trend', () => {
    const values = [10, 20, 30, 40, 50];
    expect(detectTrend(values)).toBe('RISING');
  });

  it('should detect declining trend', () => {
    const values = [50, 40, 30, 20, 10];
    expect(detectTrend(values)).toBe('DECLINING');
  });

  it('should detect stable trend', () => {
    const values = [50, 51, 50, 49, 50];
    expect(detectTrend(values)).toBe('STABLE');
  });

  it('should return STABLE for insufficient data', () => {
    expect(detectTrend([50])).toBe('STABLE');
  });
});

describe('calculateCAGR', () => {
  it('should calculate CAGR correctly', () => {
    const cagr = calculateCAGR(100, 200, 5);
    expect(cagr).toBeCloseTo(14.87, 1);
  });

  it('should throw error for non-positive values', () => {
    expect(() => calculateCAGR(0, 100, 5)).toThrow();
    expect(() => calculateCAGR(100, -100, 5)).toThrow();
  });

  it('should throw error for non-positive years', () => {
    expect(() => calculateCAGR(100, 200, 0)).toThrow();
    expect(() => calculateCAGR(100, 200, -5)).toThrow();
  });
});
