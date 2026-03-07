import { test } from 'node:test';
import * as assert from 'node:assert';
import { ContractEngine } from '../../contracts/ContractEngine.js';

test('ContractEngine registers contract', () => {
  const engine = new ContractEngine();
  engine.register({
    id: 'c1',
    principalId: 'p1',
    counterpartyId: 'cp1',
    deliverable: 'work',
    amount: 100,
    dueTick: 10,
    policyTags: []
  });
  assert.strictEqual(engine.contracts.length, 1);
});
