'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { evaluate } = require('../src/policySimulator');

test('requires step-up when score below threshold', () => {
  const policy = { stepUp: { minimumScore: 95, factor: 'security-key' }, downgrade: { minimumScore: 50, capabilities: [] } };
  const signal = {
    userId: 'tester',
    webauthn: { transport: 'internal', signCount: 0 },
    userAgent: { platform: 'macOS', browser: 'Safari' },
    localChecks: [{ name: 'disk_encryption', passed: true }]
  };

  const result = evaluate(policy, signal, 'hash');
  assert.strictEqual(result.verdict, 'step-up-required');
});

test('downgrades session when below downgrade threshold', () => {
  const policy = { stepUp: { minimumScore: 10, factor: 'otp' }, downgrade: { minimumScore: 90, capabilities: ['read-only'] } };
  const signal = {
    userId: 'tester',
    webauthn: { transport: 'usb', signCount: 1 },
    userAgent: { platform: 'linux', browser: 'Firefox' },
    localChecks: [{ name: 'os_version_supported', passed: false }]
  };

  const result = evaluate(policy, signal, 'hash');
  assert.strictEqual(result.verdict, 'session-downgraded');
});

test('offline mode bypasses risk scoring', () => {
  const policy = { offlineMode: true, downgrade: { minimumScore: 80, capabilities: [] } };
  const signal = {
    userId: 'offline',
    webauthn: { transport: 'nfc', signCount: 2 },
    userAgent: { platform: 'ios', browser: 'Safari' },
    localChecks: []
  };

  const result = evaluate(policy, signal, 'hash');
  assert.strictEqual(result.verdict, 'offline-permit');
});
