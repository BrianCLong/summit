/**
 * Unit tests for TabularSynthesizer
 */

import { TabularSynthesizer } from '../generators/TabularSynthesizer';
import { TabularData, SynthesisConfig } from '../types';

describe('TabularSynthesizer', () => {
  const sampleData: TabularData = {
    columns: ['age', 'income', 'category'],
    data: [
      [25, 50000, 'A'],
      [30, 60000, 'B'],
      [35, 70000, 'A'],
      [40, 80000, 'C'],
      [45, 90000, 'B'],
      [28, 55000, 'A'],
      [33, 65000, 'C'],
      [38, 75000, 'B'],
      [42, 85000, 'A'],
      [48, 95000, 'C']
    ]
  };

  describe('constructor', () => {
    it('should create a synthesizer with default config', () => {
      const config: SynthesisConfig = {
        method: 'statistical',
        numSamples: 100,
        preserveCorrelations: true,
        preserveDistributions: true
      };

      const synthesizer = new TabularSynthesizer(config);
      expect(synthesizer).toBeDefined();
    });

    it('should accept all synthesis methods', () => {
      const methods: SynthesisConfig['method'][] = ['statistical', 'ctgan', 'tvae', 'copula', 'bayesian'];

      methods.forEach(method => {
        const synthesizer = new TabularSynthesizer({
          method,
          numSamples: 10,
          preserveCorrelations: false,
          preserveDistributions: false
        });
        expect(synthesizer).toBeDefined();
      });
    });
  });

  describe('fit', () => {
    it('should fit on sample data without errors', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 10,
        preserveCorrelations: true,
        preserveDistributions: true
      });

      await expect(synthesizer.fit(sampleData)).resolves.not.toThrow();
    });

    it('should handle empty data gracefully', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 10,
        preserveCorrelations: false,
        preserveDistributions: false
      });

      const emptyData: TabularData = {
        columns: ['a', 'b'],
        data: []
      };

      await expect(synthesizer.fit(emptyData)).resolves.not.toThrow();
    });
  });

  describe('generate', () => {
    it('should generate synthetic data after fitting', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 20,
        preserveCorrelations: true,
        preserveDistributions: true
      });

      await synthesizer.fit(sampleData);
      const result = await synthesizer.generate();

      expect(result).toBeDefined();
      expect(result.syntheticData).toBeDefined();
      expect(result.syntheticData.columns).toEqual(sampleData.columns);
      expect(result.syntheticData.data.length).toBe(20);
      expect(result.quality).toBeDefined();
    });

    it('should respect custom numSamples parameter', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 10,
        preserveCorrelations: false,
        preserveDistributions: false
      });

      await synthesizer.fit(sampleData);
      const result = await synthesizer.generate(50);

      expect(result.syntheticData.data.length).toBe(50);
    });

    it('should throw error if generate called before fit', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 10,
        preserveCorrelations: false,
        preserveDistributions: false
      });

      await expect(synthesizer.generate()).rejects.toThrow();
    });

    it('should include quality metrics', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 20,
        preserveCorrelations: true,
        preserveDistributions: true
      });

      await synthesizer.fit(sampleData);
      const result = await synthesizer.generate();

      expect(result.quality.distributionSimilarity).toBeGreaterThanOrEqual(0);
      expect(result.quality.distributionSimilarity).toBeLessThanOrEqual(100);
      expect(result.quality.correlationPreservation).toBeGreaterThanOrEqual(0);
      expect(result.quality.statisticalFidelity).toBeGreaterThanOrEqual(0);
      expect(result.quality.diversityScore).toBeGreaterThanOrEqual(0);
    });

    it('should include privacy metrics when budget is set', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 20,
        preserveCorrelations: true,
        preserveDistributions: true,
        privacyBudget: 1.0
      });

      await synthesizer.fit(sampleData);
      const result = await synthesizer.generate();

      expect(result.privacyMetrics).toBeDefined();
      expect(result.privacyMetrics!.privacyLoss).toBeDefined();
      expect(result.privacyMetrics!.reidentificationRisk).toBeDefined();
    });
  });

  describe('synthetic data quality', () => {
    it('should preserve column structure', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 10,
        preserveCorrelations: false,
        preserveDistributions: false
      });

      await synthesizer.fit(sampleData);
      const result = await synthesizer.generate();

      // Each row should have same number of columns
      result.syntheticData.data.forEach(row => {
        expect(row.length).toBe(sampleData.columns.length);
      });
    });

    it('should generate numeric values for numeric columns', async () => {
      const synthesizer = new TabularSynthesizer({
        method: 'statistical',
        numSamples: 10,
        preserveCorrelations: false,
        preserveDistributions: false
      });

      await synthesizer.fit(sampleData);
      const result = await synthesizer.generate();

      // Age and income columns should be numeric
      result.syntheticData.data.forEach(row => {
        expect(typeof row[0]).toBe('number'); // age
        expect(typeof row[1]).toBe('number'); // income
      });
    });
  });
});
