import { describe, expect, test } from 'vitest';
import { DivergenceAnalyzer } from './divergenceAnalysis';
import { CounterfactualVariant } from '../counterfactual/counterfactualContextReassembly';
import { ModelExecutionResponse } from '../types';

describe('DivergenceAnalyzer', () => {
  test('detects poisoning when divergence exceeds threshold', () => {
    const analyzer = new DivergenceAnalyzer(0.5);
    const baseResponse: ModelExecutionResponse = {
      requestId: 'base',
      modelId: 'demo',
      output: { answer: 'ok' },
    };
    const variant: CounterfactualVariant = {
      id: 'variant-1',
      mutation: 'remove',
      mutatedSegmentId: 'segment-a',
      request: { context: { id: 'ctx', segments: [], encoded: [] }, modelId: 'demo', input: '' },
    };
    const response: ModelExecutionResponse = {
      requestId: 'variant-1',
      modelId: 'demo',
      output: { answer: 'changed' },
    };

    const scores = analyzer.score(baseResponse, [{ variant, response }]);
    const indicators = analyzer.detectPoisoning(scores, [variant]);

    expect(scores[0].divergence).toBeGreaterThanOrEqual(0.5);
    expect(indicators[0].mutatedSegmentId).toBe('segment-a');
  });
});
