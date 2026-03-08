"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InMemoryQueue_js_1 = require("../../src/queue/InMemoryQueue.js");
const ReceiptWorker_js_1 = require("../../src/ReceiptWorker.js");
const metrics_js_1 = require("../../src/metrics/metrics.js");
describe('ReceiptWorker integration', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    const enqueueJob = (queue, overrides = {}) => {
        queue.enqueue({
            id: overrides.id ?? 'job-1',
            payload: overrides.payload ?? { receipt: 'abc' },
            attempts: overrides.attempts ?? 0,
            firstEnqueuedAt: overrides.firstEnqueuedAt ?? Date.now(),
        });
    };
    it('retries with backoff before succeeding', async () => {
        const queue = new InMemoryQueue_js_1.InMemoryQueue();
        const deadLetterQueue = new InMemoryQueue_js_1.InMemoryQueue();
        const metrics = new metrics_js_1.ReceiptWorkerMetrics();
        const handler = jest
            .fn()
            .mockRejectedValueOnce(new Error('transient'))
            .mockResolvedValueOnce(undefined);
        const worker = new ReceiptWorker_js_1.ReceiptWorker({
            queue,
            deadLetterQueue,
            handler,
            metrics,
            config: {
                maxAttempts: 3,
                backoffMs: 50,
                backoffCapMs: 200,
                pollIntervalMs: 10,
            },
        });
        worker.start();
        enqueueJob(queue);
        await jest.advanceTimersByTimeAsync(20);
        await Promise.resolve();
        expect(handler).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(60);
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(20);
        expect(handler).toHaveBeenCalledTimes(2);
        expect(deadLetterQueue.size()).toBe(0);
        await expect(metrics.getLatestLag()).resolves.toBeGreaterThan(0);
        worker.stop();
    });
    it('routes messages to the dead-letter queue after max attempts', async () => {
        const queue = new InMemoryQueue_js_1.InMemoryQueue();
        const deadLetterQueue = new InMemoryQueue_js_1.InMemoryQueue();
        const metrics = new metrics_js_1.ReceiptWorkerMetrics();
        const handler = jest.fn().mockRejectedValue(new Error('persistent failure'));
        const worker = new ReceiptWorker_js_1.ReceiptWorker({
            queue,
            deadLetterQueue,
            handler,
            metrics,
            config: {
                maxAttempts: 2,
                backoffMs: 20,
                backoffCapMs: 40,
                pollIntervalMs: 5,
            },
        });
        worker.start();
        enqueueJob(queue);
        await jest.advanceTimersByTimeAsync(10);
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(30);
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(15);
        expect(handler).toHaveBeenCalledTimes(2);
        expect(deadLetterQueue.size()).toBe(1);
        await expect(metrics.getDlqDepth()).resolves.toBe(1);
        worker.stop();
    });
});
