import assert from 'node:assert/strict';
import test from 'node:test';

import { PolicyEngine } from '../src/policy-engine.js';

test('decide denies when justification is missing for sensitive collection', () => {
  const engine = new PolicyEngine({});
  const result = engine.decide({
    requiresMultimodal: false,
    language: 'en',
    ethics: { collectionJustification: {} },
  });
  assert.equal(result.status, 'deny');
  assert.equal(result.reason, 'JUSTIFICATION_REQUIRED');
});

test('decide attaches obligations for proportionality and bias monitoring', () => {
  const engine = new PolicyEngine({});
  const result = engine.decide({
    requiresMultimodal: true,
    language: 'en',
    ethics: {
      collectionJustification: {
        purpose: 'threat-hunt',
        proportionality: 0.55,
      },
      postOperationPlan: true,
      biasAudit: { risk: 'medium' },
    },
  });
  assert.equal(result.status, 'allow');
  assert.ok(result.obligations.includes('audit.proportionality-review'));
  assert.ok(result.obligations.includes('bias.monitoring'));
  assert.deepEqual(result.ethics.justification.purpose, 'threat-hunt');
});
