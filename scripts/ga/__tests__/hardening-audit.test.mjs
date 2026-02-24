import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHardeningCheck,
  isEnvironmentLimitation,
  summarizeHardeningChecks,
} from '../lib/hardening-audit.mjs';

test('classifyHardeningCheck marks successful checks as pass', () => {
  const result = classifyHardeningCheck({
    name: 'typecheck',
    exitCode: 0,
    output: 'ok',
  });

  assert.equal(result.status, 'pass');
});

test('classifyHardeningCheck marks timeout-like conditions as warning', () => {
  const result = classifyHardeningCheck({
    name: 'lint',
    exitCode: 1,
    signal: 'SIGTERM',
    errorCode: 'ETIMEDOUT',
    output: 'Command was killed with SIGTERM',
  });

  assert.equal(result.status, 'warning');
  assert.equal(
    isEnvironmentLimitation({
      output: 'Command was killed with SIGTERM',
      signal: 'SIGTERM',
      errorCode: 'ETIMEDOUT',
    }),
    true
  );
});

test('classifyHardeningCheck marks pnpm recursive outdated bug as warning', () => {
  const result = classifyHardeningCheck({
    name: 'dependency:outdated',
    exitCode: 1,
    output:
      "pnpm: Cannot read properties of undefined (reading 'optionalDependencies')",
  });

  assert.equal(result.status, 'warning');
});

test('classifyHardeningCheck marks deterministic command errors as failed', () => {
  const result = classifyHardeningCheck({
    name: 'test',
    exitCode: 1,
    output: 'FAIL server/foo.test.ts',
  });

  assert.equal(result.status, 'failed');
});

test('summarizeHardeningChecks counts each status bucket', () => {
  const summary = summarizeHardeningChecks([
    { name: 'a', status: 'pass' },
    { name: 'b', status: 'warning' },
    { name: 'c', status: 'failed' },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    pass: 1,
    warning: 1,
    failed: 1,
    failedChecks: ['c'],
    warningChecks: ['b'],
  });
});
