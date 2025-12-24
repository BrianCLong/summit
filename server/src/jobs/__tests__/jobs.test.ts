
import { JobWrapper } from '../JobWrapper';

describe('JobWrapper', () => {
    it('should execute job successfully once', async () => {
        const wrapper = new JobWrapper('test-job');
        const handler = jest.fn();

        await wrapper.execute('job-1', { val: 1 }, handler);

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should skip duplicate job (idempotency)', async () => {
        const wrapper = new JobWrapper('test-job');
        const handler = jest.fn();

        await wrapper.execute('job-1', {}, handler);
        await wrapper.execute('job-1', {}, handler); // Duplicate

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const wrapper = new JobWrapper('retry-job', { maxRetries: 3, baseDelayMs: 10 });
        let attempts = 0;
        const handler = jest.fn(async () => {
            attempts++;
            if (attempts < 2) throw new Error('Fail');
        });

        await wrapper.execute('job-2', {}, handler);

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
        const wrapper = new JobWrapper('fail-job', { maxRetries: 2, baseDelayMs: 10 });
        const handler = jest.fn(async () => { throw new Error('Persistent Fail'); });

        await expect(wrapper.execute('job-3', {}, handler))
            .rejects.toThrow('failed after 3 attempts'); // 1 initial + 2 retries = 3 attempts total logic check?
            // Code says: while (attempt <= maxRetries). attempt starts 0.
            // 0 (fail) -> inc to 1. delay.
            // 1 (fail) -> inc to 2. delay.
            // 2 (fail) -> inc to 3.
            // if (3 > 2) -> DLQ.
            // So it tries attempt 0, 1, 2. Total 3 tries.

        expect(handler).toHaveBeenCalledTimes(3);
    });
});
