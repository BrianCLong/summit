import test from 'node:test';
import assert from 'node:assert';
import { canAttemptHeal, generateHealReport } from '../../agents/factory/ci-healer';

test('canAttemptHeal correctly identifies allowlisted failures', () => {
  assert.strictEqual(canAttemptHeal('eslint-fixable'), true);
  assert.strictEqual(canAttemptHeal('unsupported-error'), false);
});

test('generateHealReport provides proper rationale', () => {
  const report1 = generateHealReport('eslint-fixable', 'error logs');
  assert.strictEqual(report1.attempted, true);

  const report2 = generateHealReport('compilation-error', 'error logs');
  assert.strictEqual(report2.attempted, false);
});
