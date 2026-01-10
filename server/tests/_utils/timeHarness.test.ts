import { useFakeTime } from './timeHarness.js';
import { jest } from '@jest/globals';

describe('timeHarness', () => {
    it('controls time', async () => {
        const start = 1672531200000; // 2023-01-01
        const clock = useFakeTime(start);

        expect(Date.now()).toBe(start);

        await clock.advanceMs(100);
        expect(Date.now()).toBe(start + 100);

        clock.restore();
    });
});
