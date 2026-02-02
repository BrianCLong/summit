import { test, describe } from 'node:test';
import assert from 'node:assert';
import { scanTimestampKeys, scanTimestampValues } from '../lib/evidence_id_consistency.mjs';

describe('Adversarial Timestamp Scanning', () => {
  describe('1A) False Positives Hunt', () => {
    test('should NOT flag large numeric IDs under ID-like keys', () => {
      const input = { id: 1735689600, internal_hash_code: 1735689602, buildNumber: 1735689603 };
      const matches = scanTimestampValues(input);
      assert.strictEqual(matches.length, 0);
    });
  });

  describe('1B) False Negatives Hunt', () => {
    test('should flag mixed-case timestamp keys', () => {
      const input = { CreatedAt: 'fixed' };
      const matches = scanTimestampKeys(input);
      assert.ok(matches.includes('CreatedAt'));
    });

    test('should flag epoch millis embedded in long strings', () => {
      const input = { msg: 'Time is 1735689600000' };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('msg'));
    });
  });

  describe('1C) Deterministic Reporting Contract', () => {
    test('scan results should be sorted', () => {
      const input = { updatedAt: '2026-01-01', createdAt: '2026-01-01' };
      const matches = scanTimestampKeys(input);
      assert.deepStrictEqual(matches, ['createdAt', 'updatedAt']);
    });
  });
});
