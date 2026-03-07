import test from 'node:test';
import assert from 'node:assert/strict';

import { parseLockDiff } from '../deps-delta.mjs';

test('parseLockDiff extracts added and removed package names', () => {
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '@@ -1 +1 @@',
    '+  /left-pad@1.3.0:',
    '+  /@scope/pkg@2.0.0:',
    '-  /old-lib@0.1.0:'
  ].join('\n');

  const result = parseLockDiff(diff);
  assert.deepEqual(result.added, ['left-pad', '@scope/pkg']);
  assert.deepEqual(result.removed, ['old-lib']);
});

test('parseLockDiff ignores metadata lines and non-package lines', () => {
  const diff = [
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '+lockfileVersion: 9.0',
    '+settings:',
    '-importers:'
  ].join('\n');

  const result = parseLockDiff(diff);
  assert.deepEqual(result.added, []);
  assert.deepEqual(result.removed, []);
});
