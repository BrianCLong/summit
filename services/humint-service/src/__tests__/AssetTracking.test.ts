/**
 * Asset Tracking Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  CreateAssetActivitySchema,
  CreateRiskIndicatorSchema,
  CreateGraphLinkSchema,
  AssetTrackingQuerySchema,
  GeoLocationSchema,
  buildNetworkQuery,
  buildPathQuery,
} from '@intelgraph/humint-types';

describe('Asset Tracking Validation Schemas', () => {
  describe('GeoLocationSchema', () => {
    it('should validate valid location', () => {
      const validLocation = {
        latitude: 38.8951,
        longitude: -77.0364,
        altitude: 100,
        accuracy: 10,
        timestamp: new Date(),
        source: 'GPS',
      };

      const result = GeoLocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const invalidLocation = {
        latitude: 100, // Invalid: > 90
        longitude: -77.0364,
        accuracy: 10,
        timestamp: new Date(),
        source: 'GPS',
      };

      const result = GeoLocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const invalidLocation = {
        latitude: 38.8951,
        longitude: -200, // Invalid: < -180
        accuracy: 10,
        timestamp: new Date(),
        source: 'GPS',
      };

      const result = GeoLocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateAssetActivitySchema', () => {
    it('should validate valid activity', () => {
      const validActivity = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'MEETING',
        timestamp: new Date(),
        duration: 60,
        participants: ['Person A', 'Person B'],
        description: 'Meeting with target organization leadership to discuss operational plans.',
        classification: 'SECRET',
      };

      const result = CreateAssetActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
    });

    it('should validate activity with location', () => {
      const validActivity = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'TRAVEL',
        timestamp: new Date(),
        location: {
          latitude: 38.8951,
          longitude: -77.0364,
          accuracy: 50,
          timestamp: new Date(),
          source: 'REPORTED',
        },
        participants: [],
        description: 'Source traveled to target location for observation.',
        classification: 'CONFIDENTIAL',
      };

      const result = CreateAssetActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
    });

    it('should reject empty description', () => {
      const invalidActivity = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'CONTACT',
        timestamp: new Date(),
        participants: [],
        description: '', // Empty
        classification: 'UNCLASSIFIED',
      };

      const result = CreateAssetActivitySchema.safeParse(invalidActivity);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateRiskIndicatorSchema', () => {
    it('should validate valid risk indicator', () => {
      const validIndicator = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        indicatorType: 'BEHAVIORAL',
        severity: 'MODERATE',
        description: 'Source exhibited unusual nervousness during last contact.',
        detectionMethod: 'HANDLER',
        mitigationActions: ['Increase surveillance', 'Reduce operational tempo'],
      };

      const result = CreateRiskIndicatorSchema.safeParse(validIndicator);
      expect(result.success).toBe(true);
    });

    it('should validate all indicator types', () => {
      const types = ['BEHAVIORAL', 'COMMUNICATION', 'FINANCIAL', 'TRAVEL', 'COUNTERINTEL', 'OPERATIONAL'];

      types.forEach((type) => {
        const indicator = {
          sourceId: '123e4567-e89b-12d3-a456-426614174000',
          indicatorType: type,
          severity: 'LOW',
          description: `Test ${type} indicator`,
          detectionMethod: 'AUTOMATED',
        };

        const result = CreateRiskIndicatorSchema.safeParse(indicator);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all severity levels', () => {
      const severities = ['MINIMAL', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'];

      severities.forEach((severity) => {
        const indicator = {
          sourceId: '123e4567-e89b-12d3-a456-426614174000',
          indicatorType: 'OPERATIONAL',
          severity,
          description: `Test ${severity} severity indicator`,
          detectionMethod: 'ANALYST',
        };

        const result = CreateRiskIndicatorSchema.safeParse(indicator);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('CreateGraphLinkSchema', () => {
    it('should validate valid graph link', () => {
      const validLink = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        entityId: '123e4567-e89b-12d3-a456-426614174001',
        entityType: 'Person',
        relationshipType: 'REPORTS_ON',
        direction: 'OUTBOUND',
        strength: 80,
        confidence: 90,
        validFrom: new Date(),
        properties: { role: 'primary target' },
      };

      const result = CreateGraphLinkSchema.safeParse(validLink);
      expect(result.success).toBe(true);
    });

    it('should validate all relationship types', () => {
      const types = [
        'REPORTS_ON', 'HAS_ACCESS_TO', 'HANDLES', 'DEBRIEFED_BY',
        'DERIVED_FROM_SOURCE', 'CORROBORATES', 'CONTRADICTS',
        'RECRUITED_BY', 'AFFILIATED_WITH', 'OPERATES_IN',
        'COMPENSATED_BY', 'TASKED_WITH',
      ];

      types.forEach((type) => {
        const link = {
          sourceId: '123e4567-e89b-12d3-a456-426614174000',
          entityId: '123e4567-e89b-12d3-a456-426614174001',
          entityType: 'Entity',
          relationshipType: type,
          direction: 'BIDIRECTIONAL',
          strength: 50,
          confidence: 75,
          validFrom: new Date(),
          properties: {},
        };

        const result = CreateGraphLinkSchema.safeParse(link);
        expect(result.success).toBe(true);
      });
    });

    it('should enforce strength/confidence bounds', () => {
      const invalidLink = {
        sourceId: '123e4567-e89b-12d3-a456-426614174000',
        entityId: '123e4567-e89b-12d3-a456-426614174001',
        entityType: 'Person',
        relationshipType: 'REPORTS_ON',
        direction: 'OUTBOUND',
        strength: 150, // Invalid: > 100
        confidence: 90,
        validFrom: new Date(),
        properties: {},
      };

      const result = CreateGraphLinkSchema.safeParse(invalidLink);
      expect(result.success).toBe(false);
    });
  });

  describe('AssetTrackingQuerySchema', () => {
    it('should apply default values', () => {
      const input = {};
      const result = AssetTrackingQuerySchema.parse(input);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.includeActivities).toBe(false);
      expect(result.includeGraphLinks).toBe(false);
      expect(result.includeRiskIndicators).toBe(false);
    });

    it('should validate complex query', () => {
      const input = {
        sourceIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
        statuses: ['ACTIVE', 'DEVELOPMENTAL'],
        riskLevels: ['HIGH', 'CRITICAL'],
        hasActiveIndicators: true,
        lastContactBefore: new Date(),
        includeActivities: true,
        includeGraphLinks: true,
        limit: 50,
      };

      const result = AssetTrackingQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Graph Query Builders', () => {
  describe('buildNetworkQuery', () => {
    it('should build valid network query', () => {
      const query = buildNetworkQuery('source-123', 2);

      expect(query).toContain('MATCH path');
      expect(query).toContain('$sourceId');
      expect(query).toContain('*1..2');
    });

    it('should support relationship type filtering', () => {
      const query = buildNetworkQuery('source-123', 2, ['REPORTS_ON', 'HAS_ACCESS_TO']);

      expect(query).toContain(':REPORTS_ON|HAS_ACCESS_TO');
    });

    it('should handle depth parameter', () => {
      const query1 = buildNetworkQuery('source-123', 1);
      const query3 = buildNetworkQuery('source-123', 3);

      expect(query1).toContain('*1..1');
      expect(query3).toContain('*1..3');
    });
  });

  describe('buildPathQuery', () => {
    it('should build valid path query', () => {
      const query = buildPathQuery('source-123', 'target-456', 5);

      expect(query).toContain('shortestPath');
      expect(query).toContain('$sourceId');
      expect(query).toContain('$targetEntityId');
      expect(query).toContain('*1..5');
    });

    it('should respect max hops', () => {
      const query = buildPathQuery('source-123', 'target-456', 3);

      expect(query).toContain('*1..3');
    });
  });
});
