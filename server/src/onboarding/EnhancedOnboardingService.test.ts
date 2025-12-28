/**
 * Enhanced Onboarding Service Tests
 *
 * Tests for the user onboarding system with guided tours and analytics.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EnhancedOnboardingService } from './EnhancedOnboardingService.js';

// Mock the database pool
jest.mock('../config/database.js', () => ({
  getPostgresPool: jest.fn(() => null),
}));

describe('EnhancedOnboardingService', () => {
  let service: EnhancedOnboardingService;

  beforeEach(() => {
    service = EnhancedOnboardingService.getInstance();
  });

  describe('getSampleContent', () => {
    it('should return sample content for admin persona', async () => {
      const result = await service.getSampleContent('admin');

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.governanceVerdict).toBeDefined();
      expect(result.governanceVerdict?.result).toBe('ALLOW');
    });

    it('should filter sample content by type', async () => {
      const result = await service.getSampleContent('admin', 'policy');

      expect(result.data).toBeInstanceOf(Array);
      result.data.forEach((sample) => {
        expect(sample.type).toBe('policy');
      });
    });

    it('should return analyst-specific content', async () => {
      const result = await service.getSampleContent('analyst');

      expect(result.data).toBeInstanceOf(Array);
      result.data.forEach((sample) => {
        expect(sample.persona).toContain('analyst');
      });
    });
  });

  describe('getContextualHelp', () => {
    it('should return contextual help items', async () => {
      const result = await service.getContextualHelp('/policies', 'user-123');

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.governanceVerdict).toBeDefined();
    });

    it('should sort help items by priority', async () => {
      const result = await service.getContextualHelp('/', 'user-123');

      if (result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          expect(result.data[i].priority).toBeGreaterThanOrEqual(result.data[i + 1].priority);
        }
      }
    });
  });

  describe('governance compliance', () => {
    it('should include governance verdict in all responses', async () => {
      const sampleResult = await service.getSampleContent('developer');
      const helpResult = await service.getContextualHelp('/', 'user-123');

      expect(sampleResult.governanceVerdict).toBeDefined();
      expect(sampleResult.governanceVerdict?.verdictId).toBeDefined();
      expect(sampleResult.governanceVerdict?.policyId).toBeDefined();

      expect(helpResult.governanceVerdict).toBeDefined();
      expect(helpResult.governanceVerdict?.verdictId).toBeDefined();
    });

    it('should include provenance in data envelope', async () => {
      const result = await service.getSampleContent('admin');

      expect(result.provenance).toBeDefined();
      expect(result.provenance.source).toBe('onboarding-service');
      expect(result.provenance.provenanceId).toBeDefined();
    });
  });

  describe('data classification', () => {
    it('should classify data appropriately', async () => {
      const result = await service.getSampleContent('admin');

      expect(result.classification).toBe('INTERNAL');
    });
  });
});
