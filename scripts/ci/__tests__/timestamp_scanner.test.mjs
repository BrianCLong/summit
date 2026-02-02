import { test, describe } from 'node:test';
import assert from 'node:assert';
import { scanTimestampKeys, scanTimestampValues, isLikelyEpoch } from '../lib/evidence_id_consistency.mjs';

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

    test('ignores non-timestamp keys', () => {
      const input = { name: 'test', id: 123, status: 'active' };
      const matches = scanTimestampKeys(input);
      assert.strictEqual(matches.length, 0);
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

    test('detects unix epoch numbers under time-suggestive keys (milliseconds)', () => {
      const input = { timestamp: 1735689600000 };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('timestamp'));
    });

    test('detects unix epoch numbers under time-suggestive keys (seconds)', () => {
      const input = { created_at: 1735689600 };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('created_at'));
    });

    test('detects stringified epoch under time-suggestive keys', () => {
      const input = { time: '1735689600' };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('time'));
    });

    test('handles deeply nested array scan', () => {
      const input = [[{ eventTime: '2026-01-01T00:00:00Z' }]];
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('[0][0].eventTime'));
    });

    test('ignores non-timestamp numbers under non-time keys', () => {
      const input = { count: 42, version: 1 };
      const matches = scanTimestampValues(input);
      assert.strictEqual(matches.length, 0);
    });

    // FALSE POSITIVE CONTROLS

    test('ignores epoch-like numbers under non-time keys (large IDs)', () => {
      // This is the key false positive scenario: a large numeric ID that
      // happens to fall in the epoch range should NOT be flagged if the
      // key doesn't suggest it's a timestamp
      const input = {
        userId: 1735689600000,      // Looks like epoch ms but key is 'userId'
        recordId: 1735689600,       // Looks like epoch s but key is 'recordId'
        count: 1735689600123,       // Count that happens to be in range
      };
      const matches = scanTimestampValues(input);
      assert.strictEqual(matches.length, 0, 'Should not flag epoch-like IDs under non-time keys');
    });

    test('ignores epoch strings embedded in text', () => {
      // Epoch strings inside larger text should not trigger
      const input = {
        message: 'ID 1735689600000 was processed',
        description: 'Record 1735689600 complete',
      };
      const matches = scanTimestampValues(input);
      assert.strictEqual(matches.length, 0, 'Should not flag embedded epoch strings');
    });

    test('flags epoch numbers under various time-suggestive key patterns', () => {
      const epoch = 1735689600000;
      const input = {
        ts: epoch,                   // Common abbreviation
        eventTime: epoch,            // Ends in Time
        lastUpdate_ms: epoch,        // Ends in _ms
        unixTimestamp: epoch,        // Contains timestamp
        createdAt: epoch,            // Ends in At
        dt: epoch,                   // Common abbreviation
      };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('ts'), 'Should flag ts');
      assert.ok(matches.includes('eventTime'), 'Should flag eventTime');
      assert.ok(matches.includes('lastUpdate_ms'), 'Should flag lastUpdate_ms');
      assert.ok(matches.includes('unixTimestamp'), 'Should flag unixTimestamp');
      assert.ok(matches.includes('createdAt'), 'Should flag createdAt');
      assert.ok(matches.includes('dt'), 'Should flag dt');
    });

    test('always flags ISO8601 regardless of key name', () => {
      // ISO8601 is high confidence, flag even under weird key names
      const input = {
        userId: '2026-01-01T00:00:00Z',
        randomField: '2026-01-01',
      };
      const matches = scanTimestampValues(input);
      assert.ok(matches.includes('userId'), 'Should flag ISO8601 even under userId');
      assert.ok(matches.includes('randomField'), 'Should flag date even under randomField');
    });
  });

  describe('isLikelyEpoch', () => {
    test('returns true for valid millisecond epochs', () => {
      assert.ok(isLikelyEpoch(1735689600000));  // 2025
      assert.ok(isLikelyEpoch(946684800001));   // Just after 2000
      assert.ok(isLikelyEpoch(4102444799999));  // Just before 2100
    });

    test('returns true for valid second epochs', () => {
      assert.ok(isLikelyEpoch(1735689600));   // 2025
      assert.ok(isLikelyEpoch(946684801));    // Just after 2000
      assert.ok(isLikelyEpoch(4102444799));   // Just before 2100
    });

    test('returns false for values outside valid range', () => {
      assert.ok(!isLikelyEpoch(0));
      assert.ok(!isLikelyEpoch(100000000));      // 1973, too old
      assert.ok(!isLikelyEpoch(5000000000000));  // 2128, too far future
    });

    test('returns false for non-numbers', () => {
      assert.ok(!isLikelyEpoch('1735689600000'));
      assert.ok(!isLikelyEpoch(null));
      assert.ok(!isLikelyEpoch(undefined));
      assert.ok(!isLikelyEpoch(NaN));
      assert.ok(!isLikelyEpoch(Infinity));
    });
  });
});
