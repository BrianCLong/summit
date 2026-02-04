import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBranchProtectionPayload } from '../generate_branch_protection_payload.mjs';

test('buildBranchProtectionPayload derives checks from policy', () => {
  const payload = buildBranchProtectionPayload();

  assert.equal(payload.required_status_checks.strict, true);
  const contexts = payload.required_status_checks.checks.map(check => check.context);
  assert.ok(contexts.includes('CI Core (Primary Gate)'));
  assert.ok(contexts.includes('Release Readiness Gate'));
});
