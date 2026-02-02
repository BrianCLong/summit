import { test, describe } from 'node:test';
import assert from 'node:assert';
import { classifyHttpError, VerificationState } from '../lib/branch-protection.mjs';

describe('Adversarial Branch Protection Drift Semantics', () => {
  describe('2A) State Machine Correctness', () => {
    test('403 permission message -> UNVERIFIABLE_PERMISSIONS', () => {
      const result = classifyHttpError(403, {}, { message: 'Must have admin rights' });
      assert.strictEqual(result.state, VerificationState.UNVERIFIABLE_PERMISSIONS);
    });

    test('403 rate limit header -> RATE_LIMITED', () => {
      const headers = { get: (n) => n.toLowerCase() === 'x-ratelimit-remaining' ? '0' : '100' };
      const result = classifyHttpError(403, headers, { message: 'error' });
      assert.strictEqual(result.state, VerificationState.RATE_LIMITED);
    });
  });
});
