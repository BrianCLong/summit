"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const time_window_utils_1 = require("./time-window-utils");
(0, vitest_1.describe)('normalizeWindow', () => {
    (0, vitest_1.it)('should order start and end correctly', () => {
        const start = 60000 + 1000;
        const end = 60000 + 500;
        const window = (0, time_window_utils_1.normalizeWindow)(start, end, 'minute', 'UTC', 1);
        // Both round down to 60000 (1 minute)
        (0, vitest_1.expect)(window.startMs).toBe(60000);
        (0, vitest_1.expect)(window.endMs).toBe(60000);
        (0, vitest_1.expect)(window.startMs).toBeLessThanOrEqual(window.endMs);
    });
    (0, vitest_1.it)('should round to minute', () => {
        // 2023-10-27T10:15:30.500Z -> 1698401730500
        // Rounded to minute -> 2023-10-27T10:15:00.000Z -> 1698401700000
        const time = 1698401730500;
        const window = (0, time_window_utils_1.normalizeWindow)(time, time + 100000, 'minute', 'UTC', 1);
        (0, vitest_1.expect)(window.startMs % 60000).toBe(0);
        (0, vitest_1.expect)(window.endMs % 60000).toBe(0);
    });
    (0, vitest_1.it)('should round to hour', () => {
        const time = 1698401730500; // 10:15:30
        const window = (0, time_window_utils_1.normalizeWindow)(time, time + 100000, 'hour', 'UTC', 1);
        (0, vitest_1.expect)(window.startMs % 3600000).toBe(0); // 10:00:00
    });
    (0, vitest_1.it)('should preserve seq', () => {
        const window = (0, time_window_utils_1.normalizeWindow)(100, 200, 'minute', 'UTC', 99);
        (0, vitest_1.expect)(window.seq).toBe(99);
    });
});
