/**
 * Seasonal Decomposition Package Tests
 */

import { SeasonalDecomposition } from '../index.js';

describe('SeasonalDecomposition', () => {
  // Generate synthetic data with trend and seasonality
  const generateSeasonalData = (length: number, period: number): { data: number[], timestamps: Date[] } => {
    const data: number[] = [];
    const timestamps: Date[] = [];
    const baseDate = new Date('2025-01-01');

    for (let i = 0; i < length; i++) {
      const trend = 100 + i * 0.5; // Linear trend
      const seasonal = 10 * Math.sin((2 * Math.PI * i) / period); // Seasonal component
      const noise = Math.random() * 2 - 1; // Small noise
      data.push(trend + seasonal + noise);
      timestamps.push(new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000));
    }

    return { data, timestamps };
  };

  describe('stlDecomposition', () => {
    it('should decompose data into trend, seasonal, and residual', () => {
      const { data, timestamps } = generateSeasonalData(100, 12);

      const result = SeasonalDecomposition.stlDecomposition(data, timestamps, {
        period: 12
      });

      expect(result.trend).toHaveLength(100);
      expect(result.seasonal).toHaveLength(100);
      expect(result.residual).toHaveLength(100);
      expect(result.method).toBe('STL');
    });

    it('should calculate seasonality strength', () => {
      const { data, timestamps } = generateSeasonalData(100, 12);

      const result = SeasonalDecomposition.stlDecomposition(data, timestamps, {
        period: 12
      });

      expect(result.seasonality_strength).toBeDefined();
      expect(result.seasonality_strength).toBeGreaterThanOrEqual(0);
      expect(result.seasonality_strength).toBeLessThanOrEqual(1);
    });
  });

  describe('additiveDecomposition', () => {
    it('should perform additive decomposition', () => {
      const { data, timestamps } = generateSeasonalData(100, 12);

      const result = SeasonalDecomposition.additiveDecomposition(data, timestamps, 12);

      expect(result.trend).toHaveLength(100);
      expect(result.seasonal).toHaveLength(100);
      expect(result.residual).toHaveLength(100);
      expect(result.method).toBe('additive');
    });
  });

  describe('multiplicativeDecomposition', () => {
    it('should perform multiplicative decomposition', () => {
      const { data, timestamps } = generateSeasonalData(100, 12);
      // Ensure all values are positive for multiplicative
      const positiveData = data.map(v => Math.abs(v) + 50);

      const result = SeasonalDecomposition.multiplicativeDecomposition(positiveData, timestamps, 12);

      expect(result.trend).toHaveLength(100);
      expect(result.seasonal).toHaveLength(100);
      expect(result.method).toBe('multiplicative');
    });
  });
});
