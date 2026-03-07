import { test } from 'node:test';
import * as assert from 'node:assert';
import { PolicyGate } from '../../governance/policy/PolicyGate.js';

test('PolicyGate evaluates action', () => {
  const gate = new PolicyGate();
  const decision = gate.evaluate({});
  assert.strictEqual(decision.allowed, true);
});
