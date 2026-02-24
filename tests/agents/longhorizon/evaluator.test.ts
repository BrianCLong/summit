// tests/agents/longhorizon/evaluator.test.ts
import { runEvaluation, generateStamp } from '../../../src/agents/longhorizon/evaluator/evaluate';
import { StagedTask } from '../../../src/agents/longhorizon/builder/build_stages';

describe('Evaluator', () => {
  const stagedTask: StagedTask = {
    evidence_id: 'LH-test-123',
    overall_objective: 'Test Objective',
    stages: [
      {
        id: 'LH-stage-1',
        title: 'Stage 1',
        objective: 'Test Objective',
        context: { pr_index: 0, commit_shas: ['s1'], is_bugfix: false }
      }
    ]
  };

  it('should produce a deterministic stamp despite different runtime_ms', async () => {
    const result1 = await runEvaluation(stagedTask, [true]);
    const result2 = await runEvaluation(stagedTask, [true]);

    // Manually vary runtime_ms to prove it is ignored in the hash
    result1.report.metrics.runtime_ms = 100;
    result2.report.metrics.runtime_ms = 200;

    const stamp1 = generateStamp(result1.report);
    const stamp2 = generateStamp(result2.report);

    expect(stamp1.content_hash).toBe(stamp2.content_hash);
  });

  it('should calculate metrics correctly', async () => {
    const result = await runEvaluation(stagedTask, [true]);
    expect(result.metrics.decomposition_score).toBe(1);
    expect(result.metrics.consistency_score).toBe(1);
  });
});
