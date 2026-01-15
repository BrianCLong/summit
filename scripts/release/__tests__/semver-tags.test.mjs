// scripts/release/__tests__/semver-tags.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseTag, compareTags } from '../semver-tags.mjs';

describe('Release Scripts: semver-tags', () => {
  describe('parseTag()', () => {
    test('should parse a GA tag', () => {
      const result = parseTag('v1.2.3');
      assert.deepStrictEqual(result, {
        major: 1,
        minor: 2,
        patch: 3,
        channel: 'ga',
      });
    });

    test('should parse an RC tag', () => {
      const result = parseTag('v1.2.3-rc.4');
      assert.deepStrictEqual(result, {
        major: 1,
        minor: 2,
        patch: 3,
        channel: 'rc',
        rc: 4,
      });
    });

    test('should throw an error for an invalid tag', () => {
      assert.throws(() => parseTag('invalid-tag'), {
        message: "Invalid tag format: invalid-tag. Must start with 'v'.",
      });
    });

    test('should throw on non-numeric version parts', () => {
      assert.throws(() => parseTag('v1.a.3'), {
        message: 'Invalid tag format: v1.a.3. Could not parse version numbers.',
      });
    });
  });

  describe('compareTags()', () => {
    test('should correctly sort tags with different major/minor/patch versions', () => {
      assert.strictEqual(compareTags('v1.10.0', 'v1.2.9'), 1, 'v1.10.0 > v1.2.9');
      assert.strictEqual(compareTags('v2.0.0', 'v1.99.99'), 1, 'v2.0.0 > v1.99.99');
      assert.strictEqual(compareTags('v1.2.3', 'v1.2.4'), -1, 'v1.2.3 < v1.2.4');
    });

    test('should sort GA tags as greater than RC tags of the same version', () => {
      assert.strictEqual(compareTags('v1.2.3', 'v1.2.3-rc.9'), 1, 'v1.2.3 > v1.2.3-rc.9');
    });

    test('should correctly sort RC tags', () => {
      assert.strictEqual(compareTags('v1.2.3-rc.10', 'v1.2.3-rc.2'), 1, 'v1.2.3-rc.10 > v1.2.3-rc.2');
      assert.strictEqual(compareTags('v1.2.3-rc.1', 'v1.2.3-rc.2'), -1, 'v1.2.3-rc.1 < v1.2.3-rc.2');
    });

    test('should identify equal tags', () => {
      assert.strictEqual(compareTags('v1.2.3', 'v1.2.3'), 0);
      assert.strictEqual(compareTags('v1.2.3-rc.5', 'v1.2.3-rc.5'), 0);
    });
  });
});
