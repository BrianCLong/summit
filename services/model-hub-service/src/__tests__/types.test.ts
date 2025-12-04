/**
 * Tests for Model Hub Types
 */

import { describe, it, expect } from '@jest/globals';
import {
  ModelSchema,
  ModelVersionSchema,
  PolicyProfileSchema,
  DeploymentConfigSchema,
  RoutingRuleSchema,
  TenantModelBindingSchema,
  ModelApprovalSchema,
  AuditEventSchema,
  ModelSelectionRequestSchema,
  CreateModelInputSchema,
} from '../types/index.js';

describe('ModelSchema', () => {
  it('should validate a valid model', () => {
    const model = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      description: 'Latest GPT-4 model',
      provider: 'openai',
      capabilities: ['nl-to-query', 'rag'],
      status: 'active',
      tags: ['production', 'fast'],
      metadata: { costPerToken: 0.01 },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
      updatedBy: 'user-123',
    };

    const result = ModelSchema.safeParse(model);
    expect(result.success).toBe(true);
  });

  it('should reject model with invalid provider', () => {
    const model = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'test-model',
      displayName: 'Test Model',
      provider: 'invalid-provider',
      capabilities: ['rag'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
      updatedBy: 'user-123',
    };

    const result = ModelSchema.safeParse(model);
    expect(result.success).toBe(false);
  });

  it('should reject model without capabilities', () => {
    const model = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'test-model',
      displayName: 'Test Model',
      provider: 'openai',
      capabilities: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
      updatedBy: 'user-123',
    };

    const result = ModelSchema.safeParse(model);
    expect(result.success).toBe(false);
  });
});

describe('ModelVersionSchema', () => {
  it('should validate a valid model version', () => {
    const version = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      modelId: '550e8400-e29b-41d4-a716-446655440000',
      version: '1.0.0',
      status: 'active',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      endpointType: 'rest',
      configuration: {
        maxTokens: 4096,
        temperature: 0.7,
      },
      resourceRequirements: {},
      performanceMetrics: {
        avgLatencyMs: 500,
        p95LatencyMs: 1200,
      },
      evaluationResults: {
        'accuracy-validation': 0.95,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
    };

    const result = ModelVersionSchema.safeParse(version);
    expect(result.success).toBe(true);
  });

  it('should validate semantic version format', () => {
    const validVersions = ['1.0.0', '2.3.4', '0.1.0', '1.0.0-beta.1'];
    const invalidVersions = ['1.0', 'v1.0.0', '1', 'latest'];

    validVersions.forEach((v) => {
      const result = ModelVersionSchema.shape.version.safeParse(v);
      expect(result.success).toBe(true);
    });

    invalidVersions.forEach((v) => {
      const result = ModelVersionSchema.shape.version.safeParse(v);
      expect(result.success).toBe(false);
    });
  });
});

describe('PolicyProfileSchema', () => {
  it('should validate a valid policy profile', () => {
    const policy = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'default-policy',
      description: 'Default policy for all models',
      rules: {
        maxTokensPerRequest: 4096,
        maxTokensPerHour: 100000,
        requireAuditLog: true,
        piiScrubbing: true,
        timeoutMs: 30000,
      },
      dataClassifications: ['unclassified', 'cui'],
      complianceFrameworks: ['SOC2', 'HIPAA'],
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
    };

    const result = PolicyProfileSchema.safeParse(policy);
    expect(result.success).toBe(true);
  });
});

describe('DeploymentConfigSchema', () => {
  it('should validate a valid deployment config', () => {
    const deployment = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
      environment: 'production',
      mode: 'canary',
      trafficPercentage: 10,
      scaling: {
        minReplicas: 2,
        maxReplicas: 10,
        targetCpuUtilization: 70,
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        intervalSeconds: 30,
      },
      circuitBreaker: {
        enabled: true,
        failureRateThreshold: 50,
      },
      rolloutStrategy: {
        type: 'gradual',
        incrementPercentage: 10,
        autoRollback: true,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
    };

    const result = DeploymentConfigSchema.safeParse(deployment);
    expect(result.success).toBe(true);
  });

  it('should reject invalid traffic percentage', () => {
    const deployment = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      modelVersionId: '550e8400-e29b-41d4-a716-446655440001',
      environment: 'production',
      mode: 'canary',
      trafficPercentage: 150, // Invalid: > 100
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
    };

    const result = DeploymentConfigSchema.safeParse(deployment);
    expect(result.success).toBe(false);
  });
});

describe('RoutingRuleSchema', () => {
  it('should validate a valid routing rule', () => {
    const rule = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'tenant-a-routing',
      description: 'Route tenant A to specific model',
      priority: 100,
      conditions: [
        { field: 'tenant_id', operator: 'equals', value: 'tenant-a' },
      ],
      conditionLogic: 'all',
      targetModelVersionId: '550e8400-e29b-41d4-a716-446655440001',
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
    };

    const result = RoutingRuleSchema.safeParse(rule);
    expect(result.success).toBe(true);
  });

  it('should require at least one condition', () => {
    const rule = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'empty-rule',
      priority: 100,
      conditions: [], // Invalid: empty
      targetModelVersionId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
    };

    const result = RoutingRuleSchema.safeParse(rule);
    expect(result.success).toBe(false);
  });
});

describe('ModelSelectionRequestSchema', () => {
  it('should validate a valid selection request', () => {
    const request = {
      capability: 'nl-to-query',
      tenantId: 'tenant-123',
      userId: 'user-456',
      featureFlags: ['new-model'],
      headers: { 'x-trace-id': 'trace-789' },
      preferredProvider: 'openai',
      requireApproved: true,
    };

    const result = ModelSelectionRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const request = {
      capability: 'rag',
      tenantId: 'tenant-123',
    };

    const result = ModelSelectionRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featureFlags).toEqual([]);
      expect(result.data.headers).toEqual({});
      expect(result.data.requireApproved).toBe(true);
    }
  });
});

describe('CreateModelInputSchema', () => {
  it('should validate create model input', () => {
    const input = {
      name: 'new-model',
      displayName: 'New Model',
      provider: 'anthropic',
      capabilities: ['classification'],
      createdBy: 'user-123',
      updatedBy: 'user-123',
    };

    const result = CreateModelInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
    }
  });
});
