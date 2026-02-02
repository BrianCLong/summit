/**
 * Tests for timestamp scanning functionality in evidence determinism gate.
 *
 * Covers:
 * - camelCase timestamp key detection
 * - Timestamp value pattern detection (ISO8601, Unix epoch)
 * - Edge cases (nested arrays, empty objects, null values)
 */

import {
  scanTimestampKeys,
  scanTimestampValues,
  isLikelyEpoch,
  isTimestampValue,
} from '../lib/evidence_id_consistency.mjs';

describe('scanTimestampKeys', () => {
  test('detects snake_case timestamp keys', () => {
    const payload = {
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    expect(scanTimestampKeys(payload).sort()).toEqual([
      'created_at',
      'updated_at',
    ]);
  });

  test('detects camelCase timestamp keys', () => {
    const payload = {
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      generatedAt: '2026-01-03T00:00:00Z',
    };
    expect(scanTimestampKeys(payload).sort()).toEqual([
      'createdAt',
      'generatedAt',
      'updatedAt',
    ]);
  });

  test('detects date/datetime keys', () => {
    const payload = {
      date: '2026-01-01',
      datetime: '2026-01-01T00:00:00Z',
      timestamp: 1735689600,
    };
    expect(scanTimestampKeys(payload).sort()).toEqual([
      'date',
      'datetime',
      'timestamp',
    ]);
  });

  test('detects duration keys', () => {
    const payload = {
      duration_ms: 1500,
      elapsed_ms: 2000,
      durationMs: 1500,
    };
    expect(scanTimestampKeys(payload).sort()).toEqual([
      'durationMs',
      'duration_ms',
      'elapsed_ms',
    ]);
  });

  test('scans nested objects', () => {
    const payload = {
      meta: {
        audit: {
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    };
    expect(scanTimestampKeys(payload)).toEqual(['meta.audit.created_at']);
  });

  test('scans arrays with correct indexing', () => {
    const payload = {
      items: [
        { name: 'first' },
        { timestamp: '2026-01-01T00:00:00Z' },
        { name: 'third' },
      ],
    };
    expect(scanTimestampKeys(payload)).toEqual(['items[1].timestamp']);
  });

  test('handles deeply nested arrays', () => {
    const payload = [
      [
        { time: 1 },
        { data: 'ok' },
      ],
    ];
    expect(scanTimestampKeys(payload)).toEqual(['[0][0].time']);
  });

  test('ignores timestamp-like values in non-timestamp keys', () => {
    const payload = {
      message: 'Created at 2026-01-01T00:00:00Z',
      id: '2026-01-01',
    };
    expect(scanTimestampKeys(payload)).toEqual([]);
  });

  test('handles null and undefined values', () => {
    const payload = {
      data: null,
      created_at: undefined,
      meta: { time: null },
    };
    expect(scanTimestampKeys(payload).sort()).toEqual([
      'created_at',
      'meta.time',
    ]);
  });

  test('handles empty objects and arrays', () => {
    expect(scanTimestampKeys({})).toEqual([]);
    expect(scanTimestampKeys([])).toEqual([]);
    expect(scanTimestampKeys({ items: [] })).toEqual([]);
  });
});

describe('scanTimestampValues', () => {
  test('detects ISO8601 datetime values', () => {
    const payload = {
      event: '2026-01-01T00:00:00Z',
      other: 'not a date',
    };
    expect(scanTimestampValues(payload)).toEqual(['event']);
  });

  test('detects ISO8601 date-only values', () => {
    const payload = {
      birthDate: '2026-01-01',
      notDate: 'not-a-date', // Not a date format at all
    };
    expect(scanTimestampValues(payload)).toEqual(['birthDate']);
  });

  test('detects Unix epoch milliseconds', () => {
    const payload = {
      ts: 1735689600000, // 2025-01-01 in ms
      small: 12345,      // Too small
    };
    expect(scanTimestampValues(payload)).toEqual(['ts']);
  });

  test('detects Unix epoch seconds', () => {
    const payload = {
      ts: 1735689600, // 2025-01-01 in seconds
      small: 12345,   // Too small
    };
    expect(scanTimestampValues(payload)).toEqual(['ts']);
  });

  test('scans nested structures for timestamp values', () => {
    const payload = {
      meta: {
        audit: {
          when: '2026-01-01T12:00:00Z',
        },
      },
    };
    expect(scanTimestampValues(payload)).toEqual(['meta.audit.when']);
  });

  test('scans arrays for timestamp values', () => {
    const payload = {
      events: [
        '2026-01-01T00:00:00Z',
        'not a timestamp',
        '2026-01-02T00:00:00Z',
      ],
    };
    expect(scanTimestampValues(payload).sort()).toEqual([
      'events[0]',
      'events[2]',
    ]);
  });

  test('handles null and undefined', () => {
    const payload = {
      a: null,
      b: undefined,
      c: { d: null },
    };
    expect(scanTimestampValues(payload)).toEqual([]);
  });

  test('does not false-positive on regular numbers', () => {
    const payload = {
      count: 42,
      price: 99.99,
      id: 123456789,
      year: 2026,
    };
    expect(scanTimestampValues(payload)).toEqual([]);
  });

  test('does not false-positive on regular strings', () => {
    const payload = {
      name: 'John Doe',
      status: 'active',
      code: 'ABC-123',
    };
    expect(scanTimestampValues(payload)).toEqual([]);
  });

  test('detects embedded ISO8601 timestamps in strings', () => {
    const payload = {
      log: 'Started at 2026-01-01T00:00:00Z for tenant A',
    };
    expect(scanTimestampValues(payload)).toEqual(['log']);
  });

  test('detects epoch timestamps in string values', () => {
    const payload = {
      epochMs: '1735689600000',
      epochS: '1735689600',
    };
    expect(scanTimestampValues(payload).sort()).toEqual(['epochMs', 'epochS']);
  });
});

describe('isLikelyEpoch', () => {
  test('detects millisecond epochs in valid range', () => {
    expect(isLikelyEpoch(1735689600000)).toBe(true);  // 2025
    expect(isLikelyEpoch(946684800001)).toBe(true);   // Just after 2000
    expect(isLikelyEpoch(4102444799999)).toBe(true);  // Just before 2100
  });

  test('detects second epochs in valid range', () => {
    expect(isLikelyEpoch(1735689600)).toBe(true);   // 2025
    expect(isLikelyEpoch(946684801)).toBe(true);    // Just after 2000
    expect(isLikelyEpoch(4102444799)).toBe(true);   // Just before 2100
  });

  test('rejects values outside valid range', () => {
    expect(isLikelyEpoch(0)).toBe(false);
    expect(isLikelyEpoch(100000000)).toBe(false);   // 1973, too old
    expect(isLikelyEpoch(5000000000000)).toBe(false); // 2128, too far future
  });

  test('rejects non-numbers', () => {
    expect(isLikelyEpoch('1735689600000')).toBe(false);
    expect(isLikelyEpoch(null)).toBe(false);
    expect(isLikelyEpoch(undefined)).toBe(false);
    expect(isLikelyEpoch(NaN)).toBe(false);
    expect(isLikelyEpoch(Infinity)).toBe(false);
  });
});

describe('isTimestampValue', () => {
  test('detects ISO8601 datetime strings', () => {
    expect(isTimestampValue('2026-01-01T00:00:00Z')).toBe(true);
    expect(isTimestampValue('2026-01-01T12:30:45.123Z')).toBe(true);
    expect(isTimestampValue('2026-01-01T00:00:00+00:00')).toBe(true);
  });

  test('detects ISO8601 date-only strings', () => {
    expect(isTimestampValue('2026-01-01')).toBe(true);
    expect(isTimestampValue('1999-12-31')).toBe(true);
  });

  test('detects embedded ISO8601 inside strings', () => {
    expect(isTimestampValue('Started at 2026-01-01T00:00:00Z')).toBe(true);
  });

  test('detects epoch strings', () => {
    expect(isTimestampValue('1735689600000')).toBe(true);
    expect(isTimestampValue('1735689600')).toBe(true);
  });

  test('rejects invalid date formats', () => {
    expect(isTimestampValue('01-01-2026')).toBe(false);
    expect(isTimestampValue('2026/01/01')).toBe(false);
    expect(isTimestampValue('January 1, 2026')).toBe(false);
  });

  test('rejects non-strings', () => {
    expect(isTimestampValue(1735689600000)).toBe(false);
    expect(isTimestampValue(null)).toBe(false);
    expect(isTimestampValue({})).toBe(false);
  });
});

describe('isTimestampValue', () => {
  test('detects ISO8601 datetime strings', () => {
    expect(isTimestampValue('2026-01-01T00:00:00Z')).toBe(true);
    expect(isTimestampValue('2026-01-01T12:30:45.123Z')).toBe(true);
    expect(isTimestampValue('2026-01-01T00:00:00+00:00')).toBe(true);
  });

  test('detects ISO8601 date-only strings', () => {
    expect(isTimestampValue('2026-01-01')).toBe(true);
    expect(isTimestampValue('1999-12-31')).toBe(true);
  });

  test('rejects invalid date formats', () => {
    expect(isTimestampValue('01-01-2026')).toBe(false);
    expect(isTimestampValue('2026/01/01')).toBe(false);
    expect(isTimestampValue('January 1, 2026')).toBe(false);
  });

  test('rejects non-strings', () => {
    expect(isTimestampValue(1735689600000)).toBe(false);
    expect(isTimestampValue(null)).toBe(false);
    expect(isTimestampValue({})).toBe(false);
  });
});
