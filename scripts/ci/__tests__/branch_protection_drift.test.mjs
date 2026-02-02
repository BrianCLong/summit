import { test, describe } from 'node:test';
import assert from 'node:assert';
import { classifyHttpError, VerificationState, computeDiff, normalizeContexts } from '../lib/branch-protection.mjs';

describe('Branch Protection Drift Detection', () => {
  describe('classifyHttpError', () => {
    test('classifies 403 rate limited', () => {
      const headers = { get: (name) => (name.toLowerCase() === 'x-ratelimit-remaining' ? '0' : null) };
      const result = classifyHttpError(403, headers, { message: 'API rate limit exceeded' });
      assert.strictEqual(result.state, VerificationState.RATE_LIMITED);
    });

    test('classifies 403 permission denied', () => {
      const headers = { get: () => '5' };
      const result = classifyHttpError(403, headers, { message: 'Resource not accessible by integration' });
      assert.strictEqual(result.state, VerificationState.UNVERIFIABLE_PERMISSIONS);
    });

    test('classifies 404 as no protection configured', () => {
      const result = classifyHttpError(404, {}, { message: 'Not Found' });
      assert.strictEqual(result.state, VerificationState.NO_PROTECTION);
    });

    test('classifies other errors as unverifiable', () => {
      const result = classifyHttpError(500, {}, { message: 'Server error' });
      assert.strictEqual(result.state, VerificationState.UNVERIFIABLE_ERROR);
    });

    test('handles timeout as unverifiable error', () => {
      const result = classifyHttpError(0, {}, 'request timeout');
      assert.strictEqual(result.state, VerificationState.UNVERIFIABLE_ERROR);
    });
  });

  describe('computeDiff', () => {
    test('detects exact match', () => {
      const policy = {
        required_status_checks: {
          strict: true,
          required_contexts: ['ci/test', 'ci/lint']
        }
      };
      const actual = {
        strict: true,
        required_contexts: ['ci/test', 'ci/lint']
      };
      const diff = computeDiff(policy, actual);
      assert.strictEqual(diff.missing_in_github.length, 0);
      assert.strictEqual(diff.extra_in_github.length, 0);
      assert.strictEqual(diff.strict_mismatch, false);
    });

    test('detects drift', () => {
      const policy = {
        required_status_checks: {
          strict: true,
          required_contexts: ['ci/test', 'ci/lint']
        }
      };
      const actual = {
        strict: false,
        required_contexts: ['ci/test']
      };
      const diff = computeDiff(policy, actual);
      assert.deepStrictEqual(diff.missing_in_github, ['ci/lint']);
      assert.strictEqual(diff.strict_mismatch, true);
    });
  });

  describe('normalizeContexts', () => {
    test('normalizes and sorts contexts', () => {
      const input = ['  ci/test  ', 'ci/lint', 'ci/test'];
      const result = normalizeContexts(input);
      assert.deepStrictEqual(result, ['ci/lint', 'ci/test']);
    });
  });
});