import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BackoffPlanOptions,
  previewDelays,
} from '../../server/src/connectors/retry/backoff.js';
import {
  createRetryPolicy,
  isRetryableError,
} from '../../server/src/connectors/retry/policy.js';

test('generates deterministic jittered delays for a fixed seed', () => {
  const delays = previewDelays(5, { seed: 'ci-seed' });
  assert.deepStrictEqual(delays, [214, 363, 800, 1411, 3833]);

  const rerun = previewDelays(5, { seed: 'ci-seed' });
  assert.deepStrictEqual(rerun, delays);
});

test('clamps jitter to the configured maximum delay', () => {
  const options: BackoffPlanOptions = {
    baseDelayMs: 1_000,
    factor: 3,
    maxDelayMs: 5_000,
    jitterRatio: 0.8,
    seed: 'clamp-check',
  };
  const delays = previewDelays(8, options);
  assert.ok(delays.every((delay) => delay >= 0 && delay <= 5_000));
  assert.ok(delays.includes(5_000));
});

test('retry policy respects retryability and limits', () => {
  const policy = createRetryPolicy({
    maxAttempts: 3,
    maxElapsedMs: 12_000,
    backoff: { seed: 'policy-seed', baseDelayMs: 300 },
  });

  const retryable = policy.shouldRetry({ status: 503 }, 1, 0);
  assert.strictEqual(retryable.retry, true);
  assert.strictEqual(retryable.reason, 'retryable');

  const delays = [retryable.delayMs];
  const second = policy.shouldRetry({ code: 'ETIMEDOUT' }, 2, 1_000);
  delays.push(second.delayMs ?? 0);
  assert.ok(second.retry);

  assert.deepStrictEqual(delays, previewDelays(2, { seed: 'policy-seed', baseDelayMs: 300 }));

  const exhausted = policy.shouldRetry({ status: 503 }, 3, 11_000);
  assert.strictEqual(exhausted.retry, false);
  assert.strictEqual(exhausted.reason, 'max-attempts-exceeded');
});

test('classifies only transient signals as retryable', () => {
  assert.ok(isRetryableError({ status: 429 }));
  assert.ok(isRetryableError({ status: 500 }));
  assert.ok(isRetryableError({ response: { status: 502 } }));
  assert.ok(isRetryableError({ code: 'ECONNRESET' }));
  assert.ok(isRetryableError({ message: 'Request timeout after 10s' }));

  assert.equal(isRetryableError({ status: 400 }), false);
  assert.equal(isRetryableError({ message: 'Validation failed' }), false);
  assert.equal(isRetryableError(null), false);
});
