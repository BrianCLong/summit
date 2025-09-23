import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PolicyEngine, evaluateLicense } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const policyPath = join(__dirname, '..', 'config', 'router.yaml');

function createEngine() {
  return PolicyEngine.fromFile(policyPath);
}

test('routes multilingual requests to qwen', () => {
  const engine = createEngine();
  const decision = engine.decide({ language: 'es' });
  assert.equal(decision.status, 'allow');
  assert.equal(decision.model.id, 'qwen-14b-instruct');
});

test('falls back to llama when approvals exist but budget is zero', () => {
  const engine = createEngine();
  const decision = engine.decide({ allowPaid: true, acceptanceBlocked: true });
  assert.equal(decision.status, 'allow');
  assert.equal(decision.model.id, 'llama-3-8b-instruct');
});

test('escalates to paid model when budget allows and approvals set', () => {
  const engine = createEngine();
  const decision = engine.decide({ allowPaid: true, acceptanceBlocked: true, caps: { hardUsd: 1 } });
  assert.equal(decision.status, 'allow');
  assert.equal(decision.model.id, 'gpt-4o-mini');
  const evaluation = engine.enforceCost('tenant-paid', { usd: 2, tokensIn: 0, tokensOut: 0 }, decision.caps);
  assert.equal(evaluation.status, 'deny');
  assert.equal(evaluation.reason, 'HARD_CAP_EXCEEDED');
});

test('cost enforcement respects hard and soft caps', () => {
  const engine = createEngine();
  const allowDecision = engine.decide({ language: 'en' });
  const caps = allowDecision.caps;
  const eval1 = engine.enforceCost('tenant', { usd: 0, tokensIn: 100, tokensOut: 100 }, caps);
  assert.equal(eval1.status, 'allow');
  const eval2 = engine.enforceCost('tenant', { usd: 0, tokensIn: 6100, tokensOut: 0 }, caps);
  assert.equal(eval2.status, 'deny');
  assert.equal(eval2.reason, 'TOKEN_CAP_EXCEEDED');
});

test('license evaluation respects deny list and overrides', () => {
  assert.equal(evaluateLicense('Proprietary-Client').status, 'deny');
  assert.equal(evaluateLicense('Commercial').status, 'deny');
  assert.equal(evaluateLicense('Commercial', {}, { allowPaid: true }).status, 'allow');
});
