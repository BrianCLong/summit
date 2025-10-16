import assert from 'node:assert/strict';
import test from 'node:test';

import { LICENSE_CLASSES, SAFETY_TIERS } from 'common-types';
import { PolicyEngine, PolicyViolation, redactPayload } from '../src/index.js';

const baseCandidate = {
  id: 'model-a',
  kind: 'model',
  skills: ['summarization'],
  ckpt: 'ckpt://model-a',
  contextTokens: 16000,
  cost: { unit: 'usd/1kTok', estimate: 0.0004 },
  latencyMs: { p50: 120, p95: 420 },
  safetyTier: SAFETY_TIERS.A,
  licenseClass: LICENSE_CLASSES.MIT_OK,
  residency: 'us-west',
  constraints: { pii: false },
};

test('filterCandidates removes disallowed residency and license', () => {
  const policy = new PolicyEngine({ allowedResidencies: ['us-west'] });
  const candidates = [
    baseCandidate,
    { ...baseCandidate, id: 'model-b', residency: 'eu-central' },
    {
      ...baseCandidate,
      id: 'model-c',
      licenseClass: LICENSE_CLASSES.RESTRICTED_TOS,
    },
  ];
  const allowed = policy.filterCandidates(candidates);
  assert.deepEqual(
    allowed.map((c) => c.id),
    ['model-a'],
  );
});

test('enforceTaskPolicy throws when residency not allowed for tenant', () => {
  const policy = new PolicyEngine({
    allowedResidencies: ['us-west', 'eu-central'],
  });
  const candidate = { ...baseCandidate, residency: 'ap-south' };
  assert.throws(
    () =>
      policy.enforceTaskPolicy(
        { id: 'task-1', policy: { allowedResidencies: ['us-west'] } },
        candidate,
      ),
    PolicyViolation,
  );
});

test('redaction removes obvious secret markers', () => {
  const payload = {
    summary: 'hello',
    password: 'super secret',
    nested: { email: 'user@example.com' },
  };
  const sanitized = redactPayload(payload);
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.nested.email, '[REDACTED]');
});

test('enforceTaskPolicy returns audit metadata for compliant candidate', () => {
  const policy = new PolicyEngine({
    allowedResidencies: ['us-west', 'eu-central'],
  });
  const result = policy.enforceTaskPolicy(
    {
      id: 'task-1',
      policy: { tenant: 'acme', containsPii: true },
      skills: ['summarization'],
    },
    baseCandidate,
  );
  assert.ok(result.tags.includes('tenant:acme'));
  assert.ok(result.tags.includes('skill:summarization'));
  assert.equal(result.retentionDays, 30);
  assert.equal(result.redactedPayload.password, undefined);
});
