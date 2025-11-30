/**
 * Schema Validation Tests
 *
 * Tests for Zod validation schemas.
 */

import { describe, it, expect } from '@jest/globals';
import {
  CreateDatasetRequestSchema,
  CreateSampleRequestSchema,
  SubmitLabelRequestSchema,
  CreateWorkflowRequestSchema,
  QualitySettingsSchema,
  PaginationParamsSchema,
} from '../../src/models/schemas.js';

describe('Validation Schemas', () => {
  describe('CreateDatasetRequestSchema', () => {
    const validRequest = {
      name: 'Test Dataset',
      description: 'A test dataset for unit testing',
      taskType: 'entity_match',
      useCase: 'model-training',
      license: {
        licenseId: 'internal-001',
        licenseType: 'internal',
        attributionRequired: false,
        commercialUseAllowed: true,
        derivativeWorksAllowed: true,
        sharingAllowed: false,
      },
      jurisdiction: {
        jurisdiction: 'US',
        dataLocalizationRequired: false,
        retentionPolicyId: 'standard-90',
        retentionDays: 90,
        complianceFrameworks: ['SOC2'],
        exportRestrictions: [],
      },
      policyProfileId: 'default-internal',
      schema: {
        version: '1.0.0',
        inputFields: [
          { name: 'text', type: 'string', required: true },
        ],
        labelFields: [
          { name: 'match', type: 'boolean', required: true },
        ],
      },
    };

    it('should validate a correct dataset request', () => {
      const result = CreateDatasetRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as Record<string, unknown>).name;

      const result = CreateDatasetRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid task type', () => {
      const invalidRequest = { ...validRequest, taskType: 'invalid_type' };

      const result = CreateDatasetRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid schema version format', () => {
      const invalidRequest = {
        ...validRequest,
        schema: { ...validRequest.schema, version: 'invalid' },
      };

      const result = CreateDatasetRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateSampleRequestSchema', () => {
    const validRequest = {
      datasetId: '550e8400-e29b-41d4-a716-446655440000',
      content: { text: 'Sample text content' },
      metadata: {
        sourceId: 'source-001',
        sourceName: 'Test Source',
        collectionDate: '2024-01-15T10:00:00Z',
        originalFormat: 'json',
      },
    };

    it('should validate a correct sample request', () => {
      const result = CreateSampleRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const requestWithOptionals = {
        ...validRequest,
        externalId: 'ext-001',
        isGolden: true,
        expectedLabel: { match: true },
        priority: 80,
      };

      const result = CreateSampleRequestSchema.safeParse(requestWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for datasetId', () => {
      const invalidRequest = { ...validRequest, datasetId: 'not-a-uuid' };

      const result = CreateSampleRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject priority outside range', () => {
      const invalidRequest = { ...validRequest, priority: 150 };

      const result = CreateSampleRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('SubmitLabelRequestSchema', () => {
    const validRequest = {
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      labels: [
        { fieldName: 'match', value: true },
      ],
      timeSpent: 30,
    };

    it('should validate a correct label submission', () => {
      const result = SubmitLabelRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require at least one label', () => {
      const invalidRequest = { ...validRequest, labels: [] };

      const result = SubmitLabelRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept optional confidence and notes', () => {
      const requestWithOptionals = {
        ...validRequest,
        confidence: 0.95,
        notes: 'High confidence match',
      };

      const result = SubmitLabelRequestSchema.safeParse(requestWithOptionals);
      expect(result.success).toBe(true);
    });

    it('should reject confidence outside 0-1 range', () => {
      const invalidRequest = { ...validRequest, confidence: 1.5 };

      const result = SubmitLabelRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('QualitySettingsSchema', () => {
    const validSettings = {
      goldenQuestionFrequency: 0.1,
      minAgreementThreshold: 0.8,
      reviewSamplingRate: 0.2,
      maxAnnotationsPerSample: 3,
      disagreementResolution: 'majority_vote',
    };

    it('should validate correct quality settings', () => {
      const result = QualitySettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
    });

    it('should reject invalid disagreement resolution strategy', () => {
      const invalidSettings = {
        ...validSettings,
        disagreementResolution: 'invalid_strategy',
      };

      const result = QualitySettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it('should reject rates outside 0-1 range', () => {
      const invalidSettings = {
        ...validSettings,
        goldenQuestionFrequency: 1.5,
      };

      const result = QualitySettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });
  });

  describe('PaginationParamsSchema', () => {
    it('should provide defaults for missing values', () => {
      const result = PaginationParamsSchema.parse({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const result = PaginationParamsSchema.parse({
        page: '2',
        pageSize: '50',
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it('should reject pageSize over 100', () => {
      const result = PaginationParamsSchema.safeParse({ pageSize: 150 });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateWorkflowRequestSchema', () => {
    const validRequest = {
      name: 'Entity Resolution Workflow',
      description: 'Multi-stage workflow for entity matching',
      datasetId: '550e8400-e29b-41d4-a716-446655440000',
      taskType: 'entity_match',
      stages: [
        {
          name: 'Initial Annotation',
          type: 'annotation',
          requiredRole: 'annotator',
          minAnnotators: 2,
          samplingStrategy: 'all',
          completionCriteria: {
            minSamplesLabeled: 100,
          },
        },
        {
          name: 'Review',
          type: 'review',
          requiredRole: 'reviewer',
          minAnnotators: 1,
          samplingStrategy: 'random',
          samplingRate: 0.3,
          completionCriteria: {
            minAgreementThreshold: 0.8,
          },
        },
      ],
      qualitySettings: {
        goldenQuestionFrequency: 0.1,
        minAgreementThreshold: 0.8,
        reviewSamplingRate: 0.2,
        maxAnnotationsPerSample: 3,
        disagreementResolution: 'majority_vote',
      },
    };

    it('should validate a correct workflow request', () => {
      const result = CreateWorkflowRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require at least one stage', () => {
      const invalidRequest = { ...validRequest, stages: [] };

      const result = CreateWorkflowRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate stage types', () => {
      const invalidRequest = {
        ...validRequest,
        stages: [
          { ...validRequest.stages[0], type: 'invalid_type' },
        ],
      };

      const result = CreateWorkflowRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});
