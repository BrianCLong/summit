import { describe, it, expect, beforeEach } from '@jest/globals';
import { PolicyEngine } from '../src/sandbox/PolicyEngine.js';
import type { SandboxEnvironment, ExperimentRequest } from '../src/types.js';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;

  const createEnvironment = (
    overrides: Partial<SandboxEnvironment> = {},
  ): SandboxEnvironment => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Environment',
    agencyId: 'test-agency',
    complianceFrameworks: ['FEDRAMP_MODERATE'],
    resourceQuotas: {
      cpuMs: 30000,
      memoryMb: 512,
      timeoutMs: 60000,
      maxOutputBytes: 1048576,
      networkEnabled: false,
      storageEnabled: false,
    },
    allowedModules: [],
    blockedModules: [],
    networkAllowlist: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    ...overrides,
  });

  const createRequest = (
    overrides: Partial<ExperimentRequest> = {},
  ): ExperimentRequest => ({
    environmentId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Experiment',
    modelConfig: {
      modelId: 'test-model',
      modelType: 'llm',
      provider: 'test-provider',
      version: '1.0.0',
    },
    testCases: [
      { id: 'tc-1', name: 'Test 1', input: 'test input', tags: [] },
    ],
    validationRules: [],
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  describe('evaluate', () => {
    it('should allow valid requests for active environments', async () => {
      const env = createEnvironment();
      const req = createRequest();

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.allowed).toBe(true);
    });

    it('should reject requests for suspended environments', async () => {
      const env = createEnvironment({ status: 'suspended' });
      const req = createRequest();

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('suspended');
    });

    it('should reject requests for expired environments', async () => {
      const env = createEnvironment({
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });
      const req = createRequest();

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('expired');
    });

    it('should flag FedRAMP HIGH violation for network without allowlist', async () => {
      const env = createEnvironment({
        complianceFrameworks: ['FEDRAMP_HIGH'],
        resourceQuotas: {
          cpuMs: 30000,
          memoryMb: 512,
          timeoutMs: 60000,
          maxOutputBytes: 1048576,
          networkEnabled: true,
          storageEnabled: false,
        },
        networkAllowlist: [],
      });
      const req = createRequest();

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.violations.some((v) => v.control === 'AC-6')).toBe(true);
    });

    it('should flag NIST AI RMF violation for missing bias testing', async () => {
      const env = createEnvironment({
        complianceFrameworks: ['NIST_AI_RMF'],
      });
      const req = createRequest({ validationRules: [] });

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.violations.some((v) => v.control === 'MAP-1.1')).toBe(true);
    });

    it('should pass NIST AI RMF with bias testing configured', async () => {
      const env = createEnvironment({
        complianceFrameworks: ['NIST_AI_RMF'],
      });
      const req = createRequest({
        validationRules: [{ type: 'bias', config: {} }],
      });

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.violations.some((v) => v.control === 'MAP-1.1')).toBe(false);
    });

    it('should flag EO 14110 violation for missing safety testing', async () => {
      const env = createEnvironment({
        complianceFrameworks: ['EXECUTIVE_ORDER_14110'],
      });
      const req = createRequest({ validationRules: [] });

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.violations.some((v) => v.control === 'SEC-3')).toBe(true);
      expect(decision.violations.find((v) => v.control === 'SEC-3')?.severity).toBe('high');
    });

    it('should pass EO 14110 with safety testing configured', async () => {
      const env = createEnvironment({
        complianceFrameworks: ['EXECUTIVE_ORDER_14110'],
      });
      const req = createRequest({
        validationRules: [{ type: 'safety', config: {} }],
      });

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.violations.some((v) => v.control === 'SEC-3')).toBe(false);
    });

    it('should provide recommendations for small test sets', async () => {
      const env = createEnvironment();
      const req = createRequest({
        testCases: [{ id: 'tc-1', name: 'Test', input: {}, tags: [] }],
      });

      const decision = await policyEngine.evaluate(env, req);

      expect(decision.recommendations.some((r) => r.includes('test cases'))).toBe(true);
    });

    it('should handle multiple compliance frameworks', async () => {
      const env = createEnvironment({
        complianceFrameworks: ['FEDRAMP_HIGH', 'NIST_AI_RMF', 'EXECUTIVE_ORDER_14110'],
      });
      const req = createRequest({ validationRules: [] });

      const decision = await policyEngine.evaluate(env, req);

      // Should have violations from multiple frameworks
      expect(decision.violations.length).toBeGreaterThan(0);
      const frameworks = new Set(decision.violations.map((v) => v.framework));
      expect(frameworks.size).toBeGreaterThan(1);
    });
  });

  describe('validateDeployment', () => {
    it('should allow staging deployments', async () => {
      const decision = await policyEngine.validateDeployment('exp-123', 'staging');

      expect(decision.allowed).toBe(true);
    });

    it('should allow production deployments with recommendations', async () => {
      const decision = await policyEngine.validateDeployment('exp-123', 'production');

      expect(decision.allowed).toBe(true);
      expect(decision.recommendations.length).toBeGreaterThan(0);
    });
  });
});
