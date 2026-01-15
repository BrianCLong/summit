// scripts/release/__tests__/find-prev-tag.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { findPreviousTag } from '../find-prev-tag.mjs';

describe('Release Scripts: find-prev-tag', () => {
  const tags = ['v0.2.9', 'v0.3.0-rc.1', 'v0.3.0-rc.2', 'v0.3.0'];

  test('should find the previous RC tag', () => {
    const previousTag = findPreviousTag('v0.3.0-rc.2', tags);
    assert.strictEqual(previousTag, 'v0.3.0-rc.1');
  });

  test('should find the previous GA tag', () => {
    const previousTag = findPreviousTag('v0.3.0', tags);
    assert.strictEqual(previousTag, 'v0.2.9');
  });

  test('should return null for the first tag', () => {
    const previousTag = findPreviousTag('v0.2.9', tags);
    assert.strictEqual(previousTag, null);
  });

  test('should throw an error if the current tag is not found', () => {
    assert.throws(() => findPreviousTag('v1.0.0', tags), {
      message: 'Current tag not found in the list of all tags.',
    });
  });
});
