import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRulesetPayload } from '../generate_ruleset_payload.mjs';

test('buildRulesetPayload uses policy contexts and branch refs', () => {
  const payload = buildRulesetPayload();

  assert.equal(payload.target, 'branch');
  assert.equal(payload.enforcement, 'active');
  assert.ok(payload.conditions.ref_name.include.includes('refs/heads/main'));

  const contexts = payload.rules
    .find(rule => rule.type === 'required_status_checks')
    ?.parameters.required_status_checks.map(check => check.context);

  assert.ok(contexts.includes('CI Core (Primary Gate)'));
  assert.ok(contexts.includes('Release Readiness Gate'));
});
