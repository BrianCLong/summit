import test from 'node:test';
import assert from 'node:assert';
import { acquireWriteLease, releaseWriteLease } from '../../../agents/runtime/locks/writeLease.ts';

test('acquireWriteLease should throw on conflict', () => {
  const target = 'src/test-file.txt';
  const holder1 = 'worker1';
  const holder2 = 'worker2';

  acquireWriteLease(target, holder1);

  assert.throws(() => acquireWriteLease(target, holder2), {
    message: 'WRITE_LEASE_CONFLICT'
  });

  releaseWriteLease(target, holder1);

  // After releasing, should be able to acquire
  assert.doesNotThrow(() => acquireWriteLease(target, holder2));
  releaseWriteLease(target, holder2);
});
