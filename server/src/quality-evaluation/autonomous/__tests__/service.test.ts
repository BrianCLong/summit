import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { AutonomousEvaluationService } from '../service.js';
import { EvaluationCapabilityType, ProhibitedActionType, EvaluationRequest } from '../types.js';

describe('AutonomousEvaluationService', () => {
  let service: AutonomousEvaluationService;

  beforeEach(() => {
    service = new AutonomousEvaluationService();
  });

  // Epic 1: Evaluation Capability Taxonomy
  it('should register default capabilities correctly', () => {
    const cap = service.getCapability(EvaluationCapabilityType.TEST_GENERATION);
    expect(cap).toBeDefined();
    expect(cap?.prohibitedActions).toContain(ProhibitedActionType.SELF_APPROVAL);
  });

  // Epic 2: Bounded Self-Testing Harness
  it('should enforce timeout constraints', async () => {
    const request: EvaluationRequest = {
      traceId: 'test-1',
      agentId: 'agent-1',
      capability: EvaluationCapabilityType.STATIC_ANALYSIS,
      target: 'some code',
      criteria: [{
        id: 'crit-1',
        description: 'Exists',
        logic: 'exists',
        isStatic: true
      }],
      constraints: {
        timeoutMs: 35000, // Exceeds 30s limit
        maxSteps: 10,
        memoryLimitMb: 128
      }
    };

    // The validation happens inside service.evaluate -> schema validation
    await expect(service.evaluate(request)).rejects.toThrow();
  });

  it('should run evaluation and return advisory report', async () => {
    const request: EvaluationRequest = {
      traceId: 'test-2',
      agentId: 'agent-1',
      capability: EvaluationCapabilityType.STATIC_ANALYSIS,
      target: 'some code',
      criteria: [{
        id: 'crit-1',
        description: 'Length check',
        logic: 'maxLength 20',
        isStatic: true
      }],
      constraints: {
        timeoutMs: 1000,
        maxSteps: 10,
        memoryLimitMb: 128
      }
    };

    const report = await service.evaluate(request);

    expect(report.isAdvisory).toBe(true);
    expect(report.criteriaResults[0].passed).toBe(true);
  });

  // Epic 3: Evaluation Criteria Transparency
  it('should reject requests without criteria', async () => {
    const request: any = {
      traceId: 'test-3',
      agentId: 'agent-1',
      capability: EvaluationCapabilityType.STATIC_ANALYSIS,
      target: 'some code',
      constraints: { timeoutMs: 1000, maxSteps: 10, memoryLimitMb: 128 }
    };

    await expect(service.evaluate(request)).rejects.toThrow();
  });

  // Epic 5: Threat Modeling
  it('should handle evaluation failures gracefully', async () => {
     // A request that fails the criteria
     const request: EvaluationRequest = {
      traceId: 'test-4',
      agentId: 'agent-1',
      capability: EvaluationCapabilityType.STATIC_ANALYSIS,
      target: 'very long string that exceeds the max length of 10',
      criteria: [{
        id: 'crit-1',
        description: 'Length check',
        logic: 'maxLength 10',
        isStatic: true
      }],
      constraints: {
        timeoutMs: 1000,
        maxSteps: 10,
        memoryLimitMb: 128
      }
    };

    const report = await service.evaluate(request);
    expect(report.criteriaResults[0].passed).toBe(false);
    expect(report.isAdvisory).toBe(true);
  });
});
