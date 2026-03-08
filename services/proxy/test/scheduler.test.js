"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scheduler_1 = require("../src/router/scheduler");
const luxon_1 = require("luxon");
test('window open/closed', () => {
    const w = [{ start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] }];
    expect((0, scheduler_1.isWindowOpen)(w, luxon_1.DateTime.fromISO('2025-08-29T10:00:00'))).toBe(true);
    expect((0, scheduler_1.isWindowOpen)(w, luxon_1.DateTime.fromISO('2025-08-30T10:00:00'))).toBe(false); // Saturday
});
test('pick prefers open model', () => {
    const c = [
        {
            name: 'A',
            class: 'hosted',
            rpm_cap: 1,
            tpm_cap: 1,
            usage_windows: [{ start: '00:00', end: '00:01' }],
            counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: false },
        },
        {
            name: 'B',
            class: 'local',
            rpm_cap: 100,
            tpm_cap: 1_000_000,
            counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: true },
        },
    ];
    const { chosen } = (0, scheduler_1.pickModel)(c, ['A', 'B']);
    expect(chosen.name).toBe('B');
});
