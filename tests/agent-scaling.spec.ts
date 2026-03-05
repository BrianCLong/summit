import { describe, it, expect } from 'vitest';
import { EvaluationRunner } from '../src/agent-scaling/evaluation-runner';

describe('EvaluationRunner', () => {
    it('should generate valid evaluation metrics', async () => {
        const runner = new EvaluationRunner();
        const results = await runner.runEvaluation();

        expect(results).toBeDefined();
        expect(results.singleAgent).toBeDefined();
        expect(results.multiAgent).toBeDefined();
        expect(results.multiAgent.metrics.coordinationOverhead).toBeGreaterThan(0);
    });
});
