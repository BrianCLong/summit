import { describe, it, expect } from '@jest/globals';
import {
  ResourceQuotasSchema,
  SandboxEnvironmentSchema,
  ExperimentRequestSchema,
  DeploymentRequestSchema,
  ComplianceFrameworkSchema,
} from '../src/types.js';

describe('Type Schemas', () => {
  describe('ComplianceFrameworkSchema', () => {
    it('should accept valid frameworks', () => {
      expect(ComplianceFrameworkSchema.parse('FEDRAMP_HIGH')).toBe('FEDRAMP_HIGH');
      expect(ComplianceFrameworkSchema.parse('NIST_AI_RMF')).toBe('NIST_AI_RMF');
      expect(ComplianceFrameworkSchema.parse('EXECUTIVE_ORDER_14110')).toBe('EXECUTIVE_ORDER_14110');
    });

    it('should reject invalid frameworks', () => {
      expect(() => ComplianceFrameworkSchema.parse('INVALID')).toThrow();
    });
  });

  describe('ResourceQuotasSchema', () => {
    it('should apply default values', () => {
      const result = ResourceQuotasSchema.parse({});

      expect(result.cpuMs).toBe(30000);
      expect(result.memoryMb).toBe(512);
      expect(result.timeoutMs).toBe(60000);
      expect(result.maxOutputBytes).toBe(1048576);
      expect(result.networkEnabled).toBe(false);
      expect(result.storageEnabled).toBe(false);
    });

    it('should accept custom values', () => {
      const result = ResourceQuotasSchema.parse({
        cpuMs: 60000,
        memoryMb: 1024,
        networkEnabled: true,
      });

      expect(result.cpuMs).toBe(60000);
      expect(result.memoryMb).toBe(1024);
      expect(result.networkEnabled).toBe(true);
    });

    it('should reject values below minimum', () => {
      expect(() => ResourceQuotasSchema.parse({ cpuMs: 5 })).toThrow();
      expect(() => ResourceQuotasSchema.parse({ memoryMb: 32 })).toThrow();
    });

    it('should reject values above maximum', () => {
      expect(() => ResourceQuotasSchema.parse({ cpuMs: 500000 })).toThrow();
      expect(() => ResourceQuotasSchema.parse({ memoryMb: 16384 })).toThrow();
    });
  });

  describe('SandboxEnvironmentSchema', () => {
    it('should validate complete environment', () => {
      const env = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Env',
        agencyId: 'agency-123',
        complianceFrameworks: ['FEDRAMP_MODERATE'],
        resourceQuotas: { cpuMs: 30000, memoryMb: 512, timeoutMs: 60000, maxOutputBytes: 1048576, networkEnabled: false, storageEnabled: false },
        allowedModules: [],
        blockedModules: [],
        networkAllowlist: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      };

      const result = SandboxEnvironmentSchema.parse(env);
      expect(result.id).toBe(env.id);
      expect(result.status).toBe('active');
    });

    it('should reject invalid UUID', () => {
      const env = {
        id: 'not-a-uuid',
        name: 'Test',
        agencyId: 'agency',
        complianceFrameworks: [],
        resourceQuotas: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => SandboxEnvironmentSchema.parse(env)).toThrow();
    });

    it('should reject empty name', () => {
      const env = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
        agencyId: 'agency',
        complianceFrameworks: [],
        resourceQuotas: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => SandboxEnvironmentSchema.parse(env)).toThrow();
    });
  });

  describe('ExperimentRequestSchema', () => {
    it('should validate complete request', () => {
      const req = {
        environmentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Experiment',
        modelConfig: {
          modelId: 'gpt-4',
          modelType: 'llm',
          provider: 'openai',
          version: '1.0',
        },
        testCases: [
          { id: 'tc-1', name: 'Test 1', input: 'hello' },
        ],
      };

      const result = ExperimentRequestSchema.parse(req);
      expect(result.name).toBe('Test Experiment');
      expect(result.testCases).toHaveLength(1);
      expect(result.validationRules).toEqual([]);
    });

    it('should validate with all model types', () => {
      const modelTypes = ['llm', 'vision', 'speech', 'multimodal', 'custom'];

      for (const modelType of modelTypes) {
        const req = {
          environmentId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test',
          modelConfig: {
            modelId: 'test',
            modelType,
            provider: 'test',
            version: '1.0',
          },
          testCases: [{ id: '1', name: 'test', input: {} }],
        };

        expect(() => ExperimentRequestSchema.parse(req)).not.toThrow();
      }
    });

    it('should validate all validation rule types', () => {
      const ruleTypes = ['accuracy', 'bias', 'safety', 'latency', 'compliance', 'custom'];

      const req = {
        environmentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        modelConfig: {
          modelId: 'test',
          modelType: 'llm',
          provider: 'test',
          version: '1.0',
        },
        testCases: [{ id: '1', name: 'test', input: {} }],
        validationRules: ruleTypes.map((type) => ({ type, config: {} })),
      };

      const result = ExperimentRequestSchema.parse(req);
      expect(result.validationRules).toHaveLength(ruleTypes.length);
    });
  });

  describe('DeploymentRequestSchema', () => {
    it('should validate deployment request', () => {
      const req = {
        experimentId: '550e8400-e29b-41d4-a716-446655440000',
        targetEnvironment: 'staging',
        approvals: [
          { approverId: 'user-1', role: 'lead', approvedAt: new Date() },
          { approverId: 'user-2', role: 'security', approvedAt: new Date() },
        ],
        deploymentConfig: {
          replicas: 2,
          resources: {},
          rolloutStrategy: 'canary',
        },
      };

      const result = DeploymentRequestSchema.parse(req);
      expect(result.targetEnvironment).toBe('staging');
      expect(result.approvals).toHaveLength(2);
    });

    it('should apply deployment config defaults', () => {
      const req = {
        experimentId: '550e8400-e29b-41d4-a716-446655440000',
        targetEnvironment: 'production',
        approvals: [
          { approverId: 'user-1', role: 'lead', approvedAt: new Date() },
        ],
        deploymentConfig: {
          resources: {},
        },
      };

      const result = DeploymentRequestSchema.parse(req);
      expect(result.deploymentConfig.replicas).toBe(1);
      expect(result.deploymentConfig.rolloutStrategy).toBe('canary');
      expect(result.deploymentConfig.autoRollback).toBe(true);
    });

    it('should reject invalid target environment', () => {
      const req = {
        experimentId: '550e8400-e29b-41d4-a716-446655440000',
        targetEnvironment: 'invalid',
        approvals: [],
        deploymentConfig: { resources: {} },
      };

      expect(() => DeploymentRequestSchema.parse(req)).toThrow();
    });
  });
});
