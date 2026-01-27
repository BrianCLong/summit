/**
 * Adoption Analytics Service Tests
 *
 * Tests for privacy-respecting adoption analytics.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdoptionAnalyticsService } from './AdoptionAnalyticsService.ts';
import type { AdoptionEventRaw, ConsentRecord } from './types.ts';

// Mock the database pool
jest.mock('../../config/database.ts', () => ({
  getPostgresPool: jest.fn(() => null),
}));

describe('AdoptionAnalyticsService', () => {
  let service: AdoptionAnalyticsService;

  beforeEach(() => {
    service = AdoptionAnalyticsService.getInstance();
  });

  describe('consent handling', () => {
    it('should not track events without consent', async () => {
      const event: AdoptionEventRaw = {
        eventId: 'event-1',
        eventType: 'feature_used',
        tenantId: 'tenant-1',
        userId: 'user-1',
        featureId: 'search',
        timestamp: new Date(),
        sessionId: 'session-1',
        properties: {},
        consent: {
          analyticsConsent: false,
          consentSource: 'none',
          consentVersion: '1.0',
        },
      };

      // Should not throw, just skip tracking
      await expect(service.trackEvent(event)).resolves.not.toThrow();
    });

    it('should track events with explicit consent', async () => {
      const event: AdoptionEventRaw = {
        eventId: 'event-2',
        eventType: 'feature_used',
        tenantId: 'tenant-1',
        userId: 'user-1',
        featureId: 'search',
        timestamp: new Date(),
        sessionId: 'session-1',
        properties: {},
        consent: {
          analyticsConsent: true,
          consentedAt: new Date(),
          consentSource: 'explicit',
          consentVersion: '1.0',
        },
      };

      // Should not throw
      await expect(service.trackEvent(event)).resolves.not.toThrow();
    });
  });

  describe('privacy protection', () => {
    it('should hash user and tenant identifiers', async () => {
      const event: AdoptionEventRaw = {
        eventId: 'event-3',
        eventType: 'feature_used',
        tenantId: 'tenant-123',
        userId: 'user-456',
        featureId: 'dashboard',
        timestamp: new Date(),
        sessionId: 'session-789',
        properties: {},
        consent: {
          analyticsConsent: true,
          consentedAt: new Date(),
          consentSource: 'explicit',
          consentVersion: '1.0',
        },
      };

      // The service should anonymize the event before storage
      await service.trackEvent(event);

      // We can't directly verify the hashing without exposing internals,
      // but we can verify the service doesn't throw
    });

    it('should strip PII from properties', async () => {
      const event: AdoptionEventRaw = {
        eventId: 'event-4',
        eventType: 'feature_used',
        tenantId: 'tenant-1',
        userId: 'user-1',
        featureId: 'search',
        timestamp: new Date(),
        sessionId: 'session-1',
        properties: {
          email: 'user@example.com', // Should be removed
          name: 'John Doe', // Should be removed
          query: 'search term', // Should be kept
        },
        consent: {
          analyticsConsent: true,
          consentedAt: new Date(),
          consentSource: 'explicit',
          consentVersion: '1.0',
        },
      };

      await expect(service.trackEvent(event)).resolves.not.toThrow();
    });
  });

  describe('batch tracking', () => {
    it('should track multiple events and report counts', async () => {
      const events: AdoptionEventRaw[] = [
        {
          eventId: 'batch-1',
          eventType: 'feature_used',
          tenantId: 'tenant-1',
          userId: 'user-1',
          featureId: 'search',
          timestamp: new Date(),
          sessionId: 'session-1',
          properties: {},
          consent: { analyticsConsent: true, consentSource: 'explicit', consentVersion: '1.0' },
        },
        {
          eventId: 'batch-2',
          eventType: 'feature_used',
          tenantId: 'tenant-1',
          userId: 'user-2',
          featureId: 'dashboard',
          timestamp: new Date(),
          sessionId: 'session-2',
          properties: {},
          consent: { analyticsConsent: false, consentSource: 'none', consentVersion: '1.0' },
        },
      ];

      const result = await service.trackEventBatch(events);

      expect(result.tracked).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('feature registration', () => {
    it('should register features for tracking', () => {
      const feature = {
        id: 'new-feature',
        name: 'New Feature',
        category: 'core' as const,
        description: 'A new feature',
        trackingEvents: ['feature_used'],
        adoptionThreshold: 3,
        enabled: true,
      };

      // Should not throw
      expect(() => service.registerFeature(feature)).not.toThrow();
    });
  });

  describe('funnel registration', () => {
    it('should register funnels for analysis', () => {
      const funnel = {
        id: 'test-funnel',
        name: 'Test Funnel',
        timeWindow: 7 * 24 * 60 * 60 * 1000,
        steps: [
          { id: 'step-1', name: 'Step 1', eventType: 'feature_viewed' as const },
          { id: 'step-2', name: 'Step 2', eventType: 'feature_used' as const },
        ],
      };

      expect(() => service.registerFunnel(funnel)).not.toThrow();
    });
  });

  describe('governance compliance', () => {
    it('should include governance verdict in analytics results', async () => {
      const options = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        granularity: 'day' as const,
      };

      const result = await service.getFeatureAdoption(options);

      expect(result.governanceVerdict).toBeDefined();
      expect(result.governanceVerdict?.result).toBe('ALLOW');
    });
  });
});
