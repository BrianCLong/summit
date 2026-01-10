import assert from 'node:assert/strict';
import test from 'node:test';
import {
  durationSeconds,
  percentile,
  regressionTriggered,
  validateOverrides,
} from '../lib/ci-perf.mjs';

test('durationSeconds parses API timestamps', () => {
  const startedAt = '2026-01-01T00:00:00Z';
  const completedAt = '2026-01-01T00:01:40Z';
  assert.equal(durationSeconds(startedAt, completedAt), 100);
});

test('percentile computes p50 and p95', () => {
  const values = [10, 20, 30, 40];
  assert.equal(percentile(values, 50), 20);
  assert.equal(percentile(values, 95), 40);
});

test('regressionTriggered detects threshold breaches', () => {
  assert.equal(regressionTriggered(120, 100, 15), true);
  assert.equal(regressionTriggered(114, 100, 15), false);
});

test('validateOverrides flags expired, broad, and overlong exceptions', () => {
  const overrides = {
    version: 1,
    overrides: [
      {
        id: 'expired',
        target: { workflow_file: 'pr-quality-gate.yml', job: 'SBOM (warn-only policy)' },
        owner: 'release-ops',
        ticket: 'CI-1',
        created: '2026-01-01T00:00:00Z',
        expires: '2026-01-05T00:00:00Z',
        rationale: 'Temporary investigation',
        allowed_overage_percent: 10,
      },
      {
        id: 'too-broad',
        target: { workflow_file: '*', job: '*' },
        owner: 'release-ops',
        ticket: 'CI-2',
        created: '2026-01-01T00:00:00Z',
        expires: '2026-01-20T00:00:00Z',
        rationale: 'Overly broad',
        allowed_overage_percent: 10,
      },
    ],
  };
  const failures = validateOverrides(overrides, {
    now: new Date('2026-01-10T00:00:00Z'),
    maxDays: 14,
  });
  assert.ok(failures.some((failure) => failure.includes('expired')));
  assert.ok(failures.some((failure) => failure.includes('overly broad')));
  assert.ok(failures.some((failure) => failure.includes('exceeds max duration')));
});
