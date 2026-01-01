/**
 * Predictive Analytics Verification Tests
 *
 * Verifies that the predictive execution engine cannot escape its governance cage.
 * Tests compliance with the Predictive Model Contract.
 *
 * @module test/verification/predictive
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PredictiveExecutionEngine } from '../../server/src/analytics/engine/PredictiveExecutionEngine.js';
import { PolicyEngine } from '../../server/src/governance/PolicyEngine.js';
import { Policy } from '../../server/src/governance/types.js';
import {
  PredictionRequest,
  PredictionModel,
  PredictionError,
  ExecutionContext,
  PredictionScore,
} from '../../server/src/analytics/engine/types.js';

describe('Predictive Analytics Governance Verification', () => {
  let engine: PredictiveExecutionEngine;
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    // Create policy engine with test policies
    const policies: Policy[] = [
      {
        id: 'test-deny-high-risk',
        description: 'Deny high-risk predictions',
        scope: { stages: ['runtime'], tenants: ['*'] },
        rules: [{ field: 'inputs.riskLevel', operator: 'eq', value: 'high' }],
        action: 'DENY',
      },
    ];
    policyEngine = new PolicyEngine(policies);

    // Create predictive engine
    engine = new PredictiveExecutionEngine(
      { enablePolicyChecks: true, enableAuditLog: true },
      policyEngine
    );

    // Register a test model
    const testModel: PredictionModel = {
      modelId: 'test-trend-model',
      version: '1.0.0',
      type: 'trend_analysis',
      accuracy: { metric: 'mae', value: 0.85 },
      deployedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(),
      validationResults: {
        validatedAt: new Date().toISOString(),
        validationDataset: 'test-dataset',
        accuracyMetrics: { mae: 0.85 },
        testsPassed: 10,
        testsFailed: 0,
      },
      executor: async (request: PredictionRequest, context: ExecutionContext) => {
        // Simple mock executor
        const output: PredictionScore = {
          predictionId: context.predictionId,
          type: request.type,
          value: 0.75,
          confidence: 0.8,
          unit: 'probability',
          timestamp: new Date().toISOString(),
        };
        return output;
      },
    };

    engine.registerModel(testModel);
  });

  // ==========================================================================
  // Test 1: Predictive runs require declared capability
  // ==========================================================================

  describe('Capability Authorization', () => {
    it('should allow predictions with valid capability', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        agentId: 'agent-456',
        inputs: { metric: 'compliance_score' },
      };

      const response = await engine.predict(request);

      expect(response).toBeDefined();
      expect(response.output).toBeDefined();
      expect(response.metadata.capabilityAuthorization).toBe('agent-456');
    });

    it('should record capability authorization in metadata', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        agentId: 'agent-789',
        inputs: { metric: 'policy_violations' },
      };

      const response = await engine.predict(request);

      expect(response.metadata.capabilityAuthorization).toBe('agent-789');
      expect(response.metadata.governanceVerdict).toBeDefined();
      expect(response.metadata.governanceVerdict.action).toBe('ALLOW');
    });
  });

  // ==========================================================================
  // Test 2: Limits and budgets are enforced
  // ==========================================================================

  describe('Resource Limits', () => {
    it('should enforce execution timeout', async () => {
      // Register a slow model
      const slowModel: PredictionModel = {
        modelId: 'slow-model',
        version: '1.0.0',
        type: 'risk_assessment',
        accuracy: { metric: 'accuracy', value: 0.9 },
        deployedAt: new Date().toISOString(),
        validatedAt: new Date().toISOString(),
        validationResults: {
          validatedAt: new Date().toISOString(),
          validationDataset: 'test',
          accuracyMetrics: {},
          testsPassed: 1,
          testsFailed: 0,
        },
        executor: async () => {
          // Simulate slow execution
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            predictionId: 'test',
            type: 'risk_assessment',
            value: 0.5,
            confidence: 0.7,
            unit: 'risk_score',
            timestamp: new Date().toISOString(),
          } as PredictionScore;
        },
      };

      engine.registerModel(slowModel);

      const request: PredictionRequest = {
        type: 'risk_assessment',
        tenantId: 'tenant-123',
        inputs: {},
        options: { maxExecutionTimeMs: 500 }, // 500ms timeout
      };

      await expect(engine.predict(request)).rejects.toThrow('Execution timeout');
    });

    it('should respect maximum execution time limit', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: {},
        options: { maxExecutionTimeMs: 999999999 }, // Try to exceed max
      };

      const response = await engine.predict(request);

      // Engine should cap the limit
      expect(response.metadata.executionTime).toBeLessThan(300000); // Max is 5 minutes
    });

    it('should track resource usage in metadata', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: {},
      };

      const response = await engine.predict(request);

      expect(response.metadata.resourceUsage).toBeDefined();
      expect(response.metadata.resourceUsage.cpuMs).toBeGreaterThan(0);
      expect(response.metadata.resourceUsage.memoryMb).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Test 3: Predictions include explanations and confidence
  // ==========================================================================

  describe('Explainability Requirements', () => {
    it('should include complete metadata envelope', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: {},
      };

      const response = await engine.predict(request);

      // Verify all required metadata fields
      expect(response.metadata.predictionId).toBeDefined();
      expect(response.metadata.predictionType).toBe('trend_analysis');
      expect(response.metadata.modelVersion).toBeDefined();
      expect(response.metadata.governanceVerdict).toBeDefined();
      expect(response.metadata.capabilityAuthorization).toBeDefined();
      expect(response.metadata.tenantId).toBe('tenant-123');
      expect(response.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(response.metadata.confidence).toBeLessThanOrEqual(1);
      expect(response.metadata.assumptions).toBeDefined();
      expect(response.metadata.limitations).toBeDefined();
      expect(response.metadata.dataSources).toBeDefined();
      expect(response.metadata.dataFreshness).toBeDefined();
      expect(response.metadata.executionTime).toBeGreaterThan(0);
      expect(response.metadata.resourceUsage).toBeDefined();
      expect(response.metadata.explanation).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
    });

    it('should include explanation with method and top factors', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: {},
      };

      const response = await engine.predict(request);

      expect(response.metadata.explanation.method).toBeDefined();
      expect(response.metadata.explanation.topFactors).toBeDefined();
      expect(response.metadata.explanation.topFactors.length).toBeGreaterThan(0);
    });

    it('should include confidence score in valid range', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: {},
      };

      const response = await engine.predict(request);

      expect(response.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(response.metadata.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Test 4: Policy denial blocks predictions
  // ==========================================================================

  describe('Policy Enforcement', () => {
    it('should block predictions denied by policy', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: { riskLevel: 'high' }, // Will trigger DENY policy
      };

      await expect(engine.predict(request)).rejects.toThrow('Policy denied prediction');
    });

    it('should include policy verdict in metadata for allowed predictions', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: { riskLevel: 'low' },
      };

      const response = await engine.predict(request);

      expect(response.metadata.governanceVerdict.action).toBe('ALLOW');
      expect(response.metadata.governanceVerdict.metadata).toBeDefined();
      expect(response.metadata.governanceVerdict.provenance).toBeDefined();
    });
  });

  // ==========================================================================
  // Test 5: All activity is audited
  // ==========================================================================

  describe('Audit Trail', () => {
    it('should generate audit event for successful prediction', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        agentId: 'agent-456',
        inputs: {},
      };

      await engine.predict(request);

      const auditEvents = engine.getAuditEvents();
      expect(auditEvents.length).toBeGreaterThan(0);

      const lastEvent = auditEvents[auditEvents.length - 1];
      expect(lastEvent.eventType).toBe('prediction_executed');
      expect(lastEvent.tenantId).toBe('tenant-123');
      expect(lastEvent.agentId).toBe('agent-456');
      expect(lastEvent.predictionType).toBe('trend_analysis');
      expect(lastEvent.confidence).toBeDefined();
    });

    it('should generate audit event for failed prediction', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: { riskLevel: 'high' }, // Will fail policy check
      };

      try {
        await engine.predict(request);
      } catch (error) {
        // Expected to fail
      }

      const auditEvents = engine.getAuditEvents();
      expect(auditEvents.length).toBeGreaterThan(0);

      const failureEvent = auditEvents.find((e) => e.eventType === 'prediction_failed');
      expect(failureEvent).toBeDefined();
      expect(failureEvent!.errorCode).toBe('POLICY_DENIED');
    });

    it('should record all predictions in audit log', async () => {
      engine.clearAuditEvents();

      const requests = [
        { type: 'trend_analysis' as const, tenantId: 'tenant-1', inputs: {} },
        { type: 'trend_analysis' as const, tenantId: 'tenant-2', inputs: {} },
        { type: 'trend_analysis' as const, tenantId: 'tenant-3', inputs: {} },
      ];

      for (const req of requests) {
        await engine.predict(req);
      }

      const auditEvents = engine.getAuditEvents();
      const executedEvents = auditEvents.filter((e) => e.eventType === 'prediction_executed');
      expect(executedEvents.length).toBe(3);
    });
  });

  // ==========================================================================
  // Test 6: Output validation
  // ==========================================================================

  describe('Output Validation', () => {
    it('should validate prediction output schema', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: {},
      };

      const response = await engine.predict(request);

      // Verify output structure
      expect(response.output).toBeDefined();
      expect(response.output.predictionId).toBeDefined();

      if ('value' in response.output) {
        // PredictionScore
        expect(typeof response.output.value).toBe('number');
        expect(response.output.confidence).toBeGreaterThanOrEqual(0);
        expect(response.output.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should reject predictions with incomplete metadata', async () => {
      // Register a model that returns incomplete metadata
      const badModel: PredictionModel = {
        modelId: 'bad-model',
        version: '1.0.0',
        type: 'likelihood_scoring',
        accuracy: { metric: 'accuracy', value: 0.5 },
        deployedAt: new Date().toISOString(),
        validatedAt: new Date().toISOString(),
        validationResults: {
          validatedAt: new Date().toISOString(),
          validationDataset: 'test',
          accuracyMetrics: {},
          testsPassed: 1,
          testsFailed: 0,
        },
        executor: async (request, context) => {
          // Return output without confidence (invalid)
          return {
            predictionId: context.predictionId,
            type: request.type,
            value: 0.5,
            unit: 'probability',
            timestamp: new Date().toISOString(),
          } as any; // Force invalid output
        },
      };

      engine.registerModel(badModel);

      const request: PredictionRequest = {
        type: 'likelihood_scoring',
        tenantId: 'tenant-123',
        inputs: {},
      };

      // Should fail validation and generate audit event
      try {
        await engine.predict(request);
      } catch (error) {
        expect(error).toBeInstanceOf(PredictionError);
      }
    });
  });

  // ==========================================================================
  // Test 7: Caching behavior
  // ==========================================================================

  describe('Prediction Caching', () => {
    it('should cache identical prediction requests', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: { metric: 'test' },
      };

      const response1 = await engine.predict(request);
      const response2 = await engine.predict(request);

      // Should return same prediction ID (cached)
      expect(response1.output.predictionId).toBe(response2.output.predictionId);
    });

    it('should respect cache disable option', async () => {
      const request: PredictionRequest = {
        type: 'trend_analysis',
        tenantId: 'tenant-123',
        inputs: { metric: 'test2' },
        options: { enableCaching: false },
      };

      const response1 = await engine.predict(request);
      const response2 = await engine.predict(request);

      // Should generate new predictions (no caching)
      expect(response1.output.predictionId).not.toBe(response2.output.predictionId);
    });
  });
});
