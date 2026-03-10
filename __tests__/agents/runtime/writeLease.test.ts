import { test } from 'node:test';
import assert from 'node:assert';
import { acquireWriteLease, releaseWriteLease, getLeaseHolder, clearAllLeases } from '../../../agents/runtime/locks/writeLease.js';

test('writeLease prevents conflicting writers', () => {
  clearAllLeases();
  acquireWriteLease('path/to/file', 'worker1');
  assert.strictEqual(getLeaseHolder('path/to/file'), 'worker1');

  assert.throws(() => {
    acquireWriteLease('path/to/file', 'worker2');
  }, /WRITE_LEASE_CONFLICT/);

  releaseWriteLease('path/to/file', 'worker1');
  assert.strictEqual(getLeaseHolder('path/to/file'), undefined);
});
