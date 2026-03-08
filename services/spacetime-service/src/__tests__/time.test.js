"use strict";
/**
 * Unit tests for temporal utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const time_js_1 = require("../utils/time.js");
(0, globals_1.describe)('intervalsOverlap', () => {
    (0, globals_1.it)('returns true for overlapping intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(true);
    });
    (0, globals_1.it)('returns true for fully contained interval', () => {
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 0, end: 20 }, { start: 5, end: 15 })).toBe(true);
    });
    (0, globals_1.it)('returns true for identical intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 5, end: 15 }, { start: 5, end: 15 })).toBe(true);
    });
    (0, globals_1.it)('returns true for touching intervals (edge case)', () => {
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(true);
    });
    (0, globals_1.it)('returns false for non-overlapping intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 0, end: 10 }, { start: 11, end: 20 })).toBe(false);
    });
    (0, globals_1.it)('handles zero-length intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 5, end: 5 }, { start: 5, end: 5 })).toBe(true);
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 5, end: 5 }, { start: 0, end: 10 })).toBe(true);
        (0, globals_1.expect)((0, time_js_1.intervalsOverlap)({ start: 5, end: 5 }, { start: 10, end: 20 })).toBe(false);
    });
});
(0, globals_1.describe)('overlapDuration', () => {
    (0, globals_1.it)('calculates correct overlap duration', () => {
        (0, globals_1.expect)((0, time_js_1.overlapDuration)({ start: 0, end: 10 }, { start: 5, end: 15 })).toBe(5);
    });
    (0, globals_1.it)('returns 0 for non-overlapping intervals', () => {
        (0, globals_1.expect)((0, time_js_1.overlapDuration)({ start: 0, end: 10 }, { start: 11, end: 20 })).toBe(0);
    });
    (0, globals_1.it)('returns contained interval duration', () => {
        (0, globals_1.expect)((0, time_js_1.overlapDuration)({ start: 0, end: 20 }, { start: 5, end: 15 })).toBe(10);
    });
    (0, globals_1.it)('handles zero-length intervals', () => {
        (0, globals_1.expect)((0, time_js_1.overlapDuration)({ start: 5, end: 5 }, { start: 0, end: 10 })).toBe(0);
    });
});
(0, globals_1.describe)('intervalIntersection', () => {
    (0, globals_1.it)('returns intersection of overlapping intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalIntersection)({ start: 0, end: 10 }, { start: 5, end: 15 })).toEqual({
            start: 5,
            end: 10,
        });
    });
    (0, globals_1.it)('returns null for non-overlapping intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalIntersection)({ start: 0, end: 10 }, { start: 11, end: 20 })).toBeNull();
    });
    (0, globals_1.it)('returns correct intersection for touching intervals', () => {
        (0, globals_1.expect)((0, time_js_1.intervalIntersection)({ start: 0, end: 10 }, { start: 10, end: 20 })).toEqual({
            start: 10,
            end: 10,
        });
    });
});
(0, globals_1.describe)('mergeIntervals', () => {
    (0, globals_1.it)('merges overlapping intervals', () => {
        const intervals = [
            { start: 0, end: 10 },
            { start: 5, end: 15 },
            { start: 20, end: 30 },
        ];
        (0, globals_1.expect)((0, time_js_1.mergeIntervals)(intervals)).toEqual([
            { start: 0, end: 15 },
            { start: 20, end: 30 },
        ]);
    });
    (0, globals_1.it)('handles empty array', () => {
        (0, globals_1.expect)((0, time_js_1.mergeIntervals)([])).toEqual([]);
    });
    (0, globals_1.it)('handles single interval', () => {
        (0, globals_1.expect)((0, time_js_1.mergeIntervals)([{ start: 0, end: 10 }])).toEqual([{ start: 0, end: 10 }]);
    });
    (0, globals_1.it)('merges adjacent intervals', () => {
        const intervals = [
            { start: 0, end: 10 },
            { start: 10, end: 20 },
        ];
        (0, globals_1.expect)((0, time_js_1.mergeIntervals)(intervals)).toEqual([{ start: 0, end: 20 }]);
    });
    (0, globals_1.it)('handles unsorted input', () => {
        const intervals = [
            { start: 20, end: 30 },
            { start: 0, end: 10 },
            { start: 5, end: 15 },
        ];
        (0, globals_1.expect)((0, time_js_1.mergeIntervals)(intervals)).toEqual([
            { start: 0, end: 15 },
            { start: 20, end: 30 },
        ]);
    });
});
(0, globals_1.describe)('findGaps', () => {
    (0, globals_1.it)('finds gaps between intervals', () => {
        const intervals = [
            { start: 0, end: 10 },
            { start: 20, end: 30 },
        ];
        (0, globals_1.expect)((0, time_js_1.findGaps)(intervals)).toEqual([{ start: 10, end: 20 }]);
    });
    (0, globals_1.it)('handles empty array', () => {
        (0, globals_1.expect)((0, time_js_1.findGaps)([])).toEqual([]);
    });
    (0, globals_1.it)('handles empty array with bounds', () => {
        (0, globals_1.expect)((0, time_js_1.findGaps)([], { start: 0, end: 100 })).toEqual([{ start: 0, end: 100 }]);
    });
    (0, globals_1.it)('finds gap before first interval', () => {
        const intervals = [{ start: 20, end: 30 }];
        (0, globals_1.expect)((0, time_js_1.findGaps)(intervals, { start: 0, end: 30 })).toEqual([{ start: 0, end: 20 }]);
    });
    (0, globals_1.it)('finds gap after last interval', () => {
        const intervals = [{ start: 0, end: 10 }];
        (0, globals_1.expect)((0, time_js_1.findGaps)(intervals, { start: 0, end: 30 })).toEqual([{ start: 10, end: 30 }]);
    });
});
(0, globals_1.describe)('timestampInWindow', () => {
    (0, globals_1.it)('returns true for timestamp in window', () => {
        (0, globals_1.expect)((0, time_js_1.timestampInWindow)(50, { start: 0, end: 100 })).toBe(true);
    });
    (0, globals_1.it)('returns true for timestamp at window start', () => {
        (0, globals_1.expect)((0, time_js_1.timestampInWindow)(0, { start: 0, end: 100 })).toBe(true);
    });
    (0, globals_1.it)('returns true for timestamp at window end', () => {
        (0, globals_1.expect)((0, time_js_1.timestampInWindow)(100, { start: 0, end: 100 })).toBe(true);
    });
    (0, globals_1.it)('returns false for timestamp before window', () => {
        (0, globals_1.expect)((0, time_js_1.timestampInWindow)(-1, { start: 0, end: 100 })).toBe(false);
    });
    (0, globals_1.it)('returns false for timestamp after window', () => {
        (0, globals_1.expect)((0, time_js_1.timestampInWindow)(101, { start: 0, end: 100 })).toBe(false);
    });
});
(0, globals_1.describe)('intervalInWindow', () => {
    (0, globals_1.it)('returns true for fully contained interval', () => {
        (0, globals_1.expect)((0, time_js_1.intervalInWindow)({ start: 20, end: 80 }, { start: 0, end: 100 })).toBe(true);
    });
    (0, globals_1.it)('returns false for interval extending before window', () => {
        (0, globals_1.expect)((0, time_js_1.intervalInWindow)({ start: -10, end: 50 }, { start: 0, end: 100 })).toBe(false);
    });
    (0, globals_1.it)('returns false for interval extending after window', () => {
        (0, globals_1.expect)((0, time_js_1.intervalInWindow)({ start: 50, end: 110 }, { start: 0, end: 100 })).toBe(false);
    });
});
(0, globals_1.describe)('intervalIntersectsWindow', () => {
    (0, globals_1.it)('returns true for intersecting interval', () => {
        (0, globals_1.expect)((0, time_js_1.intervalIntersectsWindow)({ start: -10, end: 50 }, { start: 0, end: 100 })).toBe(true);
    });
    (0, globals_1.it)('returns false for non-intersecting interval', () => {
        (0, globals_1.expect)((0, time_js_1.intervalIntersectsWindow)({ start: 101, end: 200 }, { start: 0, end: 100 })).toBe(false);
    });
});
(0, globals_1.describe)('calculateCoverage', () => {
    (0, globals_1.it)('calculates 100% coverage', () => {
        const intervals = [{ start: 0, end: 100 }];
        (0, globals_1.expect)((0, time_js_1.calculateCoverage)(intervals, { start: 0, end: 100 })).toBe(1);
    });
    (0, globals_1.it)('calculates 50% coverage', () => {
        const intervals = [{ start: 0, end: 50 }];
        (0, globals_1.expect)((0, time_js_1.calculateCoverage)(intervals, { start: 0, end: 100 })).toBe(0.5);
    });
    (0, globals_1.it)('calculates coverage with multiple intervals', () => {
        const intervals = [
            { start: 0, end: 25 },
            { start: 75, end: 100 },
        ];
        (0, globals_1.expect)((0, time_js_1.calculateCoverage)(intervals, { start: 0, end: 100 })).toBe(0.5);
    });
    (0, globals_1.it)('handles overlapping intervals', () => {
        const intervals = [
            { start: 0, end: 60 },
            { start: 40, end: 100 },
        ];
        (0, globals_1.expect)((0, time_js_1.calculateCoverage)(intervals, { start: 0, end: 100 })).toBe(1);
    });
    (0, globals_1.it)('clips intervals to window', () => {
        const intervals = [{ start: -50, end: 150 }];
        (0, globals_1.expect)((0, time_js_1.calculateCoverage)(intervals, { start: 0, end: 100 })).toBe(1);
    });
    (0, globals_1.it)('handles zero-duration window', () => {
        const intervals = [{ start: 0, end: 100 }];
        (0, globals_1.expect)((0, time_js_1.calculateCoverage)(intervals, { start: 50, end: 50 })).toBe(0);
    });
});
(0, globals_1.describe)('splitTimeWindow', () => {
    (0, globals_1.it)('splits window into equal buckets', () => {
        const buckets = (0, time_js_1.splitTimeWindow)({ start: 0, end: 100 }, 4);
        (0, globals_1.expect)(buckets).toHaveLength(4);
        (0, globals_1.expect)(buckets[0]).toEqual({ start: 0, end: 25 });
        (0, globals_1.expect)(buckets[3]).toEqual({ start: 75, end: 100 });
    });
    (0, globals_1.it)('handles single bucket', () => {
        const buckets = (0, time_js_1.splitTimeWindow)({ start: 0, end: 100 }, 1);
        (0, globals_1.expect)(buckets).toHaveLength(1);
        (0, globals_1.expect)(buckets[0]).toEqual({ start: 0, end: 100 });
    });
    (0, globals_1.it)('throws for zero or negative bucket count', () => {
        (0, globals_1.expect)(() => (0, time_js_1.splitTimeWindow)({ start: 0, end: 100 }, 0)).toThrow();
        (0, globals_1.expect)(() => (0, time_js_1.splitTimeWindow)({ start: 0, end: 100 }, -1)).toThrow();
    });
});
(0, globals_1.describe)('findSequences', () => {
    (0, globals_1.it)('finds continuous sequences', () => {
        const events = [
            { timestamp: 0 },
            { timestamp: 10 },
            { timestamp: 20 },
            { timestamp: 100 },
            { timestamp: 110 },
        ];
        const sequences = (0, time_js_1.findSequences)(events, 50);
        (0, globals_1.expect)(sequences).toHaveLength(2);
        (0, globals_1.expect)(sequences[0]).toHaveLength(3);
        (0, globals_1.expect)(sequences[1]).toHaveLength(2);
    });
    (0, globals_1.it)('handles empty array', () => {
        (0, globals_1.expect)((0, time_js_1.findSequences)([], 50)).toEqual([]);
    });
    (0, globals_1.it)('handles single event', () => {
        const sequences = (0, time_js_1.findSequences)([{ timestamp: 0 }], 50);
        (0, globals_1.expect)(sequences).toHaveLength(1);
        (0, globals_1.expect)(sequences[0]).toHaveLength(1);
    });
    (0, globals_1.it)('handles unsorted input', () => {
        const events = [{ timestamp: 100 }, { timestamp: 0 }, { timestamp: 10 }];
        const sequences = (0, time_js_1.findSequences)(events, 50);
        (0, globals_1.expect)(sequences).toHaveLength(2);
    });
});
(0, globals_1.describe)('formatDuration', () => {
    (0, globals_1.it)('formats milliseconds', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(500)).toBe('500ms');
    });
    (0, globals_1.it)('formats seconds', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(5000)).toBe('5s');
    });
    (0, globals_1.it)('formats minutes', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(120000)).toBe('2m');
    });
    (0, globals_1.it)('formats minutes and seconds', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(125000)).toBe('2m 5s');
    });
    (0, globals_1.it)('formats hours', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(3600000)).toBe('1h');
    });
    (0, globals_1.it)('formats hours and minutes', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(3720000)).toBe('1h 2m');
    });
    (0, globals_1.it)('formats days', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(86400000)).toBe('1d');
    });
    (0, globals_1.it)('formats days and hours', () => {
        (0, globals_1.expect)((0, time_js_1.formatDuration)(90000000)).toBe('1d 1h');
    });
});
(0, globals_1.describe)('lastNWindow', () => {
    (0, globals_1.it)('creates window for last N milliseconds', () => {
        const now = 1000000;
        const window = (0, time_js_1.lastNWindow)(500, 'ms', now);
        (0, globals_1.expect)(window).toEqual({ start: 999500, end: 1000000 });
    });
    (0, globals_1.it)('creates window for last N seconds', () => {
        const now = 1000000;
        const window = (0, time_js_1.lastNWindow)(5, 's', now);
        (0, globals_1.expect)(window).toEqual({ start: 995000, end: 1000000 });
    });
    (0, globals_1.it)('creates window for last N minutes', () => {
        const now = 1000000;
        const window = (0, time_js_1.lastNWindow)(2, 'm', now);
        (0, globals_1.expect)(window).toEqual({ start: 880000, end: 1000000 });
    });
    (0, globals_1.it)('creates window for last N hours', () => {
        const now = 10000000;
        const window = (0, time_js_1.lastNWindow)(1, 'h', now);
        (0, globals_1.expect)(window).toEqual({ start: 6400000, end: 10000000 });
    });
    (0, globals_1.it)('creates window for last N days', () => {
        const now = 100000000;
        const window = (0, time_js_1.lastNWindow)(1, 'd', now);
        (0, globals_1.expect)(window).toEqual({ start: 13600000, end: 100000000 });
    });
});
(0, globals_1.describe)('validateTimeWindow', () => {
    (0, globals_1.it)('validates valid window', () => {
        const result = (0, time_js_1.validateTimeWindow)({ start: 0, end: 1000 }, 10000);
        (0, globals_1.expect)(result.valid).toBe(true);
    });
    (0, globals_1.it)('rejects window with end < start', () => {
        const result = (0, time_js_1.validateTimeWindow)({ start: 1000, end: 0 }, 10000);
        (0, globals_1.expect)(result.valid).toBe(false);
        (0, globals_1.expect)(result.error).toContain('end');
    });
    (0, globals_1.it)('rejects window exceeding max span', () => {
        const result = (0, time_js_1.validateTimeWindow)({ start: 0, end: 20000 }, 10000);
        (0, globals_1.expect)(result.valid).toBe(false);
        (0, globals_1.expect)(result.error).toContain('exceeds');
    });
});
(0, globals_1.describe)('alignToBucket', () => {
    (0, globals_1.it)('floors to bucket boundary', () => {
        (0, globals_1.expect)((0, time_js_1.alignToBucket)(1234, 1000, true)).toBe(1000);
    });
    (0, globals_1.it)('ceils to bucket boundary', () => {
        (0, globals_1.expect)((0, time_js_1.alignToBucket)(1234, 1000, false)).toBe(2000);
    });
    (0, globals_1.it)('handles exact boundary', () => {
        (0, globals_1.expect)((0, time_js_1.alignToBucket)(2000, 1000, true)).toBe(2000);
        (0, globals_1.expect)((0, time_js_1.alignToBucket)(2000, 1000, false)).toBe(2000);
    });
});
