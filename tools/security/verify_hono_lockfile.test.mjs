import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const runGate = (fixture) =>
  spawnSync('node', ['tools/security/verify_hono_lockfile.mjs', fixture], {
    encoding: 'utf8',
  });

test('passes on good fixture', () => {
  const result = runGate('tools/security/fixtures/pnpm-lock.good.yaml');
  assert.equal(result.status, 0, result.stderr || 'expected pass');
});

test('fails on bad fixture', () => {
  const result = runGate('tools/security/fixtures/pnpm-lock.bad.yaml');
  assert.notEqual(result.status, 0, 'expected fail');
});
