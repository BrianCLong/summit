import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { globalRiskEmitter, emitRiskObservation } from '../../src/counter_ai/hooks';

describe('Counter-AI Risk Hooks', () => {
  it('should emit and retrieve recent observations', () => {
    emitRiskObservation('test:surface', { node: 'A' });
    const obs = globalRiskEmitter.getRecentObservations(1);
    assert.strictEqual(obs.length, 1);
    assert.strictEqual(obs[0].risk_surface, 'test:surface');
    assert.deepStrictEqual(obs[0].metadata, { node: 'A' });
  });

  it('should not throw on high volume', () => {
    for (let i = 0; i < 2000; i++) {
      emitRiskObservation(`test:surface:${i}`);
    }
    const obs = globalRiskEmitter.getRecentObservations(10);
    assert.strictEqual(obs.length, 10);
    assert.strictEqual(obs[9].risk_surface, 'test:surface:1999');
  });
});
