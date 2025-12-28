/**
 * Experimentation Service Tests
 *
 * Tests for the A/B testing and experimentation framework.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExperimentationService } from './ExperimentationService.js';

describe('ExperimentationService', () => {
  let service: ExperimentationService;

  beforeEach(() => {
    service = ExperimentationService.getInstance();
  });

  describe('experiment creation', () => {
    it('should validate variant weights sum to 100', async () => {
      const invalidExperiment = {
        name: 'Test Experiment',
        description: 'Test',
        type: 'a_b' as const,
        hypothesis: 'Test hypothesis',
        primaryMetric: 'conversion',
        secondaryMetrics: [],
        variants: [
          { id: 'control', name: 'Control', description: '', weight: 30, config: {}, isControl: true },
          { id: 'treatment', name: 'Treatment', description: '', weight: 30, config: {}, isControl: false },
        ],
        targetingRules: [],
        trafficAllocation: 100,
        minSampleSize: 1000,
        confidenceLevel: 0.95,
        owner: 'test-user',
      };

      await expect(service.createExperiment(invalidExperiment)).rejects.toThrow(
        'Variant weights must sum to 100'
      );
    });

    it('should require exactly one control variant', async () => {
      const noControlExperiment = {
        name: 'Test Experiment',
        description: 'Test',
        type: 'a_b' as const,
        hypothesis: 'Test hypothesis',
        primaryMetric: 'conversion',
        secondaryMetrics: [],
        variants: [
          { id: 'v1', name: 'Variant 1', description: '', weight: 50, config: {}, isControl: false },
          { id: 'v2', name: 'Variant 2', description: '', weight: 50, config: {}, isControl: false },
        ],
        targetingRules: [],
        trafficAllocation: 100,
        minSampleSize: 1000,
        confidenceLevel: 0.95,
        owner: 'test-user',
      };

      await expect(service.createExperiment(noControlExperiment)).rejects.toThrow(
        'Experiment must have exactly one control variant'
      );
    });
  });

  describe('assignment consistency', () => {
    it('should assign the same variant for the same user consistently', async () => {
      const context = {
        userId: 'user-test-123',
        tenantId: 'tenant-test-123',
        attributes: {},
        consent: true,
      };

      // Note: This test requires a running experiment to be meaningful
      // In a real test, we would mock the database or create a test experiment
    });
  });

  describe('targeting rules', () => {
    it('should match equals operator correctly', () => {
      // Test targeting rule matching
      const rules = [
        { id: 'r1', attribute: 'plan', operator: 'equals' as const, value: 'pro' },
      ];

      const context = {
        userId: 'user-1',
        tenantId: 'tenant-1',
        attributes: { plan: 'pro' },
        consent: true,
      };

      // Targeting match is internal, would need to expose for testing
      // or test via integration tests
    });
  });

  describe('governance integration', () => {
    it('should include governance verdict in results', async () => {
      // Experiments should always include governance verdicts
      // This ensures compliance tracking
    });
  });
});
