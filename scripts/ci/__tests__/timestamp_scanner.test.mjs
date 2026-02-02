import { test, describe } from 'node:test';
import assert from 'node:assert';
import { scanTimestampKeys, scanTimestampValues } from '../lib/evidence_id_consistency.mjs';

describe('Timestamp Scanner', () => {
  describe('scanTimestampKeys', () => {
    test('detects camelCase timestamp keys', () => {
      const input = { createdAt: '2026-01-01', updatedAt: '2026-01-02' };
      const matches = scanTimestampKeys(input);
      assert.ok(matches.includes('createdAt'));
      assert.ok(matches.includes('updatedAt'));
    });

    test('detects snake_case timestamp keys', () => {
      const input = { created_at: '2026-01-01' };
      const matches = scanTimestampKeys(input);
      assert.ok(matches.includes('created_at'));
    });

    test('detects nested timestamp keys', () => {
      const input = { meta: { generatedAt: '2026-01-01' } };
      const matches = scanTimestampKeys(input);
      assert.ok(matches.includes('meta.generatedAt'));
    });

    test('detects timestamp keys in arrays', () => {
      const input = [{ time: 1 }, { date: 2 }];
      const matches = scanTimestampKeys(input);
      assert.ok(matches.includes('[0].time'));
      assert.ok(matches.includes('[1].date'));
    });
  });

  describe('scanTimestampValues', () => {
    test('detects ISO8601 value patterns', () => {
      const input = { data: '2026-01-01T00:00:00Z' };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('data'));
    });

    test('detects date-only value patterns', () => {
      const input = { data: '2026-01-01' };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('data'));
    });

    test('detects embedded ISO8601 in string values', () => {
      const input = { log: 'Started at 2026-01-01T00:00:00Z' };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('log'));
    });

    test('detects unix epoch numbers (milliseconds)', () => {
      const input = { ts: 1735689600000 };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('ts'));
    });

    test('detects unix epoch numbers (seconds)', () => {
      const input = { ts: 1735689600 };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('ts'));
    });

    test('detects stringified epoch', () => {
      const input = { time: '1735689600' };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('time'));
    });

    test('handles deeply nested array scan', () => {
      const input = [[{ time: '2026-01-01T00:00:00Z' }]];
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('[0][0].time'));
    });

    test('ignores non-timestamp numbers', () => {
      const input = { count: 42, version: 1 };
      const matches = scanTimestampValues(input);
      assert.strictEqual(matches.length, 0);
    });
  });
});