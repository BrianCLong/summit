/**
 * Time Series Feature Engineering Tests
 */

import { TimeSeriesFeatureExtractor } from '../index.js';

describe('TimeSeriesFeatureExtractor', () => {
  // Generate sample time series data
  const generateData = (length: number): number[] => {
    const data: number[] = [];
    for (let i = 0; i < length; i++) {
      data.push(100 + Math.sin(i * 0.1) * 20 + Math.random() * 5);
    }
    return data;
  };

  describe('extractStatisticalFeatures', () => {
    it('should extract basic statistical features', () => {
      const data = generateData(100);
      const features = TimeSeriesFeatureExtractor.extractStatisticalFeatures(data);

      expect(features.mean).toBeDefined();
      expect(features.std).toBeDefined();
      expect(features.min).toBeDefined();
      expect(features.max).toBeDefined();
      expect(features.median).toBeDefined();
      expect(features.q25).toBeDefined();
      expect(features.q75).toBeDefined();
      expect(features.iqr).toBeDefined();
    });

    it('should calculate valid statistics', () => {
      const data = [1, 2, 3, 4, 5];
      const features = TimeSeriesFeatureExtractor.extractStatisticalFeatures(data);

      expect(features.mean).toBe(3);
      expect(features.min).toBe(1);
      expect(features.max).toBe(5);
      expect(features.median).toBe(3);
    });
  });

  describe('extractTrendFeatures', () => {
    it('should detect positive trend', () => {
      const data = Array.from({ length: 50 }, (_, i) => i * 2 + Math.random());
      const features = TimeSeriesFeatureExtractor.extractTrendFeatures(data);

      expect(features.trend_slope).toBeGreaterThan(0);
    });

    it('should detect negative trend', () => {
      const data = Array.from({ length: 50 }, (_, i) => 100 - i * 2 + Math.random());
      const features = TimeSeriesFeatureExtractor.extractTrendFeatures(data);

      expect(features.trend_slope).toBeLessThan(0);
    });
  });

  describe('extractSeasonalityFeatures', () => {
    it('should extract autocorrelation features', () => {
      const data = generateData(100);
      const features = TimeSeriesFeatureExtractor.extractSeasonalityFeatures(data);

      expect(features.autocorrelation).toBeDefined();
      expect(Array.isArray(features.autocorrelation)).toBe(true);
    });
  });

  describe('extractComplexityFeatures', () => {
    it('should calculate entropy', () => {
      const data = generateData(100);
      const features = TimeSeriesFeatureExtractor.extractComplexityFeatures(data);

      expect(features.entropy).toBeDefined();
      expect(features.complexity).toBeDefined();
    });
  });

  describe('extractPeakFeatures', () => {
    it('should detect peaks in data', () => {
      // Data with clear peaks
      const data = [1, 2, 5, 2, 1, 2, 8, 2, 1, 2, 3, 2, 1];
      const features = TimeSeriesFeatureExtractor.extractPeakFeatures(data);

      expect(features.num_peaks).toBeGreaterThan(0);
    });
  });

  describe('extractFeatures', () => {
    it('should combine all features', () => {
      const data = generateData(100);
      const timestamps = Array.from({ length: 100 }, (_, i) =>
        new Date(Date.now() + i * 3600000)
      );

      const features = TimeSeriesFeatureExtractor.extractFeatures(data, timestamps);

      expect(features.mean).toBeDefined();
      expect(features.std).toBeDefined();
      expect(features.trend_slope).toBeDefined();
      expect(features.autocorrelation).toBeDefined();
      expect(features.entropy).toBeDefined();
      expect(features.num_peaks).toBeDefined();
    });
  });
});
