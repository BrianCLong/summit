import { describe, it, expect } from 'vitest';
import { normalizeWindow } from './time-window-utils';

describe('normalizeWindow', () => {
  it('should order start and end correctly', () => {
    const start = 60000 + 1000;
    const end = 60000 + 500;
    const window = normalizeWindow(start, end, 'minute', 'UTC', 1);

    // Both round down to 60000 (1 minute)
    expect(window.startMs).toBe(60000);
    expect(window.endMs).toBe(60000);
    expect(window.startMs).toBeLessThanOrEqual(window.endMs);
  });

  it('should round to minute', () => {
    // 2023-10-27T10:15:30.500Z -> 1698401730500
    // Rounded to minute -> 2023-10-27T10:15:00.000Z -> 1698401700000
    const time = 1698401730500;
    const window = normalizeWindow(time, time + 100000, 'minute', 'UTC', 1);

    expect(window.startMs % 60000).toBe(0);
    expect(window.endMs % 60000).toBe(0);
  });

  it('should round to hour', () => {
    const time = 1698401730500; // 10:15:30
    const window = normalizeWindow(time, time + 100000, 'hour', 'UTC', 1);

    expect(window.startMs % 3600000).toBe(0); // 10:00:00
  });

  it('should preserve seq', () => {
    const window = normalizeWindow(100, 200, 'minute', 'UTC', 99);
    expect(window.seq).toBe(99);
  });
});
