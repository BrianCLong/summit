import test from 'node:test';
import assert from 'node:assert/strict';
import { tabs } from '../../ui/src/tabs.js';

test('@ga-critical ui route audit simulated tabs', () => {
  const simulated = tabs.filter((tab) => tab.status === 'simulated');
  const simulatedNames = simulated.map((tab) => tab.name).sort();

  assert.deepEqual(simulatedNames, ['CI & Chaos', 'RAG Console'].sort());
  assert.equal(simulated.length, 2);
});
