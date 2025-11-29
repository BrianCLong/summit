/**
 * Unit tests for temporal utility functions
 */

import { describe, expect, it } from '@jest/globals';
import {
  intervalsOverlap,
  overlapDuration,
  intervalIntersection,
  mergeIntervals,
  findGaps,
  timestampInWindow,
  intervalInWindow,
  intervalIntersectsWindow,
  calculateCoverage,
  splitTimeWindow,
  findSequences,
  formatDuration,
  lastNWindow,
  validateTimeWindow,
  alignToBucket,
} from '../utils/time.js';

describe('intervalsOverlap', () => {
  it('returns true for overlapping intervals', () => {
    expect(intervalsOverlap({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(true);
  });

  it('returns true for fully contained interval', () => {
    expect(intervalsOverlap({ start: 0, end: 20 }, { start: 5, end: 15 })).toBe(true);
  });

  it('returns true for identical intervals', () => {
    expect(intervalsOverlap({ start: 5, end: 15 }, { start: 5, end: 15 })).toBe(true);
  });

  it('returns true for touching intervals (edge case)', () => {
    expect(intervalsOverlap({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(true);
  });

  it('returns false for non-overlapping intervals', () => {
    expect(intervalsOverlap({ start: 0, end: 10 }, { start: 11, end: 20 })).toBe(false);
  });

  it('handles zero-length intervals', () => {
    expect(intervalsOverlap({ start: 5, end: 5 }, { start: 5, end: 5 })).toBe(true);
    expect(intervalsOverlap({ start: 5, end: 5 }, { start: 0, end: 10 })).toBe(true);
    expect(intervalsOverlap({ start: 5, end: 5 }, { start: 10, end: 20 })).toBe(false);
  });
});

describe('overlapDuration', () => {
  it('calculates correct overlap duration', () => {
    expect(overlapDuration({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(5);
  });

  it('returns 0 for non-overlapping intervals', () => {
    expect(overlapDuration({ start: 0, end: 10 }, { start: 11, end: 20 })).toBe(0);
  });

  it('returns contained interval duration', () => {
    expect(overlapDuration({ start: 0, end: 20 }, { start: 5, end: 15 })).toBe(10);
  });

  it('handles zero-length intervals', () => {
    expect(overlapDuration({ start: 5, end: 5 }, { start: 0, end: 10 })).toBe(0);
  });
});

describe('intervalIntersection', () => {
  it('returns intersection of overlapping intervals', () => {
    expect(intervalIntersection({ start: 0, end: 10 }, { start: 5, end: 15 })).toEqual({
      start: 5,
      end: 10,
    });
  });

  it('returns null for non-overlapping intervals', () => {
    expect(intervalIntersection({ start: 0, end: 10 }, { start: 11, end: 20 })).toBeNull();
  });

  it('returns correct intersection for touching intervals', () => {
    expect(intervalIntersection({ start: 0, end: 10 }, { start: 10, end: 20 })).toEqual({
      start: 10,
      end: 10,
    });
  });
});

describe('mergeIntervals', () => {
  it('merges overlapping intervals', () => {
    const intervals = [
      { start: 0, end: 10 },
      { start: 5, end: 15 },
      { start: 20, end: 30 },
    ];
    expect(mergeIntervals(intervals)).toEqual([
      { start: 0, end: 15 },
      { start: 20, end: 30 },
    ]);
  });

  it('handles empty array', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  it('handles single interval', () => {
    expect(mergeIntervals([{ start: 0, end: 10 }])).toEqual([{ start: 0, end: 10 }]);
  });

  it('merges adjacent intervals', () => {
    const intervals = [
      { start: 0, end: 10 },
      { start: 10, end: 20 },
    ];
    expect(mergeIntervals(intervals)).toEqual([{ start: 0, end: 20 }]);
  });

  it('handles unsorted input', () => {
    const intervals = [
      { start: 20, end: 30 },
      { start: 0, end: 10 },
      { start: 5, end: 15 },
    ];
    expect(mergeIntervals(intervals)).toEqual([
      { start: 0, end: 15 },
      { start: 20, end: 30 },
    ]);
  });
});

describe('findGaps', () => {
  it('finds gaps between intervals', () => {
    const intervals = [
      { start: 0, end: 10 },
      { start: 20, end: 30 },
    ];
    expect(findGaps(intervals)).toEqual([{ start: 10, end: 20 }]);
  });

  it('handles empty array', () => {
    expect(findGaps([])).toEqual([]);
  });

  it('handles empty array with bounds', () => {
    expect(findGaps([], { start: 0, end: 100 })).toEqual([{ start: 0, end: 100 }]);
  });

  it('finds gap before first interval', () => {
    const intervals = [{ start: 20, end: 30 }];
    expect(findGaps(intervals, { start: 0, end: 30 })).toEqual([{ start: 0, end: 20 }]);
  });

  it('finds gap after last interval', () => {
    const intervals = [{ start: 0, end: 10 }];
    expect(findGaps(intervals, { start: 0, end: 30 })).toEqual([{ start: 10, end: 30 }]);
  });
});

describe('timestampInWindow', () => {
  it('returns true for timestamp in window', () => {
    expect(timestampInWindow(50, { start: 0, end: 100 })).toBe(true);
  });

  it('returns true for timestamp at window start', () => {
    expect(timestampInWindow(0, { start: 0, end: 100 })).toBe(true);
  });

  it('returns true for timestamp at window end', () => {
    expect(timestampInWindow(100, { start: 0, end: 100 })).toBe(true);
  });

  it('returns false for timestamp before window', () => {
    expect(timestampInWindow(-1, { start: 0, end: 100 })).toBe(false);
  });

  it('returns false for timestamp after window', () => {
    expect(timestampInWindow(101, { start: 0, end: 100 })).toBe(false);
  });
});

describe('intervalInWindow', () => {
  it('returns true for fully contained interval', () => {
    expect(intervalInWindow({ start: 20, end: 80 }, { start: 0, end: 100 })).toBe(true);
  });

  it('returns false for interval extending before window', () => {
    expect(intervalInWindow({ start: -10, end: 50 }, { start: 0, end: 100 })).toBe(false);
  });

  it('returns false for interval extending after window', () => {
    expect(intervalInWindow({ start: 50, end: 110 }, { start: 0, end: 100 })).toBe(false);
  });
});

describe('intervalIntersectsWindow', () => {
  it('returns true for intersecting interval', () => {
    expect(intervalIntersectsWindow({ start: -10, end: 50 }, { start: 0, end: 100 })).toBe(true);
  });

  it('returns false for non-intersecting interval', () => {
    expect(intervalIntersectsWindow({ start: 101, end: 200 }, { start: 0, end: 100 })).toBe(false);
  });
});

describe('calculateCoverage', () => {
  it('calculates 100% coverage', () => {
    const intervals = [{ start: 0, end: 100 }];
    expect(calculateCoverage(intervals, { start: 0, end: 100 })).toBe(1);
  });

  it('calculates 50% coverage', () => {
    const intervals = [{ start: 0, end: 50 }];
    expect(calculateCoverage(intervals, { start: 0, end: 100 })).toBe(0.5);
  });

  it('calculates coverage with multiple intervals', () => {
    const intervals = [
      { start: 0, end: 25 },
      { start: 75, end: 100 },
    ];
    expect(calculateCoverage(intervals, { start: 0, end: 100 })).toBe(0.5);
  });

  it('handles overlapping intervals', () => {
    const intervals = [
      { start: 0, end: 60 },
      { start: 40, end: 100 },
    ];
    expect(calculateCoverage(intervals, { start: 0, end: 100 })).toBe(1);
  });

  it('clips intervals to window', () => {
    const intervals = [{ start: -50, end: 150 }];
    expect(calculateCoverage(intervals, { start: 0, end: 100 })).toBe(1);
  });

  it('handles zero-duration window', () => {
    const intervals = [{ start: 0, end: 100 }];
    expect(calculateCoverage(intervals, { start: 50, end: 50 })).toBe(0);
  });
});

describe('splitTimeWindow', () => {
  it('splits window into equal buckets', () => {
    const buckets = splitTimeWindow({ start: 0, end: 100 }, 4);
    expect(buckets).toHaveLength(4);
    expect(buckets[0]).toEqual({ start: 0, end: 25 });
    expect(buckets[3]).toEqual({ start: 75, end: 100 });
  });

  it('handles single bucket', () => {
    const buckets = splitTimeWindow({ start: 0, end: 100 }, 1);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toEqual({ start: 0, end: 100 });
  });

  it('throws for zero or negative bucket count', () => {
    expect(() => splitTimeWindow({ start: 0, end: 100 }, 0)).toThrow();
    expect(() => splitTimeWindow({ start: 0, end: 100 }, -1)).toThrow();
  });
});

describe('findSequences', () => {
  it('finds continuous sequences', () => {
    const events = [
      { timestamp: 0 },
      { timestamp: 10 },
      { timestamp: 20 },
      { timestamp: 100 },
      { timestamp: 110 },
    ];
    const sequences = findSequences(events, 50);
    expect(sequences).toHaveLength(2);
    expect(sequences[0]).toHaveLength(3);
    expect(sequences[1]).toHaveLength(2);
  });

  it('handles empty array', () => {
    expect(findSequences([], 50)).toEqual([]);
  });

  it('handles single event', () => {
    const sequences = findSequences([{ timestamp: 0 }], 50);
    expect(sequences).toHaveLength(1);
    expect(sequences[0]).toHaveLength(1);
  });

  it('handles unsorted input', () => {
    const events = [{ timestamp: 100 }, { timestamp: 0 }, { timestamp: 10 }];
    const sequences = findSequences(events, 50);
    expect(sequences).toHaveLength(2);
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5s');
  });

  it('formats minutes', () => {
    expect(formatDuration(120000)).toBe('2m');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s');
  });

  it('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3720000)).toBe('1h 2m');
  });

  it('formats days', () => {
    expect(formatDuration(86400000)).toBe('1d');
  });

  it('formats days and hours', () => {
    expect(formatDuration(90000000)).toBe('1d 1h');
  });
});

describe('lastNWindow', () => {
  it('creates window for last N milliseconds', () => {
    const now = 1000000;
    const window = lastNWindow(500, 'ms', now);
    expect(window).toEqual({ start: 999500, end: 1000000 });
  });

  it('creates window for last N seconds', () => {
    const now = 1000000;
    const window = lastNWindow(5, 's', now);
    expect(window).toEqual({ start: 995000, end: 1000000 });
  });

  it('creates window for last N minutes', () => {
    const now = 1000000;
    const window = lastNWindow(2, 'm', now);
    expect(window).toEqual({ start: 880000, end: 1000000 });
  });

  it('creates window for last N hours', () => {
    const now = 10000000;
    const window = lastNWindow(1, 'h', now);
    expect(window).toEqual({ start: 6400000, end: 10000000 });
  });

  it('creates window for last N days', () => {
    const now = 100000000;
    const window = lastNWindow(1, 'd', now);
    expect(window).toEqual({ start: 13600000, end: 100000000 });
  });
});

describe('validateTimeWindow', () => {
  it('validates valid window', () => {
    const result = validateTimeWindow({ start: 0, end: 1000 }, 10000);
    expect(result.valid).toBe(true);
  });

  it('rejects window with end < start', () => {
    const result = validateTimeWindow({ start: 1000, end: 0 }, 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('end');
  });

  it('rejects window exceeding max span', () => {
    const result = validateTimeWindow({ start: 0, end: 20000 }, 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });
});

describe('alignToBucket', () => {
  it('floors to bucket boundary', () => {
    expect(alignToBucket(1234, 1000, true)).toBe(1000);
  });

  it('ceils to bucket boundary', () => {
    expect(alignToBucket(1234, 1000, false)).toBe(2000);
  });

  it('handles exact boundary', () => {
    expect(alignToBucket(2000, 1000, true)).toBe(2000);
    expect(alignToBucket(2000, 1000, false)).toBe(2000);
  });
});
