import { SLOEvaluationEngine } from '../../platform/summitsight/engine.js';
import { SLODefinition } from '../../platform/summitsight/types.js';
import { describe, test, expect } from '@jest/globals';

describe('SLO Evaluation Engine', () => {
  const definitions: SLODefinition[] = [
    {
      service: 'maestro-api',
      metric: 'latency',
      target: 500,
      type: 'LATENCY_P95',
      period: '1h'
    }
  ];

  const engine = new SLOEvaluationEngine(definitions);

  test('should pass compliance when latency is below target', () => {
    const event = engine.evaluate(300, 'maestro-api-latency');
    expect(event.inCompliance).toBe(true);
  });

  test('should fail compliance when latency is above target', () => {
    const event = engine.evaluate(600, 'maestro-api-latency');
    expect(event.inCompliance).toBe(false);
  });
});
