import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { AutonomousEvaluationService } from '../../service';
import { EvaluationCapabilityType, EvaluationRequest } from '../../types';

describe('Autonomous Evaluation System Integration', () => {
  let service: AutonomousEvaluationService;

  beforeEach(() => {
    service = new AutonomousEvaluationService();
  });

  it('should complete a full evaluation lifecycle', async () => {
    // 1. Agent requests evaluation
    const request: EvaluationRequest = {
      traceId: 'int-1',
      agentId: 'agent-1',
      capability: EvaluationCapabilityType.STATIC_ANALYSIS,
      target: 'const x = 1;',
      criteria: [
        {
          id: 'c1',
          description: 'Contains variable declaration',
          logic: 'contains const',
          isStatic: true
        },
        {
          id: 'c2',
          description: 'Short length',
          logic: 'maxLength 50',
          isStatic: true
        }
      ],
      constraints: {
        timeoutMs: 5000,
        maxSteps: 50,
        memoryLimitMb: 128
      }
    };

    // 2. Service processes request
    const report = await service.evaluate(request);

    // 3. Verify Report Structure (Epic 4)
    expect(report.id).toBeDefined();
    expect(report.isAdvisory).toBe(true);
    expect(report.agentId).toBe('agent-1');
    expect(report.criteriaResults).toHaveLength(2);

    // 4. Verify Results
    expect(report.criteriaResults.find(r => r.criteriaId === 'c1')?.passed).toBe(true);
    expect(report.criteriaResults.find(r => r.criteriaId === 'c2')?.passed).toBe(true);

    // 5. Verify Stats (Epic 2)
    expect(report.executionStats.durationMs).toBeGreaterThan(0);
  });
});
