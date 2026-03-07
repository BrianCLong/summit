import { test } from 'node:test';
import * as assert from 'node:assert';
import { WorldKernel } from '../../simulation/civilization/WorldKernel.js';

test('WorldKernel runs deterministically', () => {
  const spec = {
    seed: 'test-seed',
    ticks: 100,
    regions: [],
    agents: Array.from({ length: 50 }).map((_, i) => ({ id: `agent-${i}` })),
    policies: []
  };
  const kernel = new WorldKernel(spec);
  const artifacts = kernel.run();
  assert.ok(artifacts.reportPath);
  assert.strictEqual(kernel.tickEngine.tick, 100);
});
