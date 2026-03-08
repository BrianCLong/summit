"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const queue_js_1 = require("../queue.js");
const metrics_queue_js_1 = require("../metrics-queue.js");
class InMemoryQueue {
    list = [];
    async lpush(_key, value) {
        this.list.unshift(value);
        return this.list.length;
    }
    async llen(_key) {
        return this.list.length;
    }
}
(0, globals_1.describe)('enqueue', () => {
    (0, globals_1.beforeEach)(() => {
        (0, queue_js_1.setQueueClient)(null);
    });
    (0, globals_1.afterEach)(() => {
        (0, queue_js_1.setQueueClient)(null);
    });
    (0, globals_1.it)('enriches job with id and enqueuedAt and updates depth gauge', async () => {
        const setSpy = globals_1.vi.spyOn(metrics_queue_js_1.queueDepth, 'set');
        const queue = new InMemoryQueue();
        (0, queue_js_1.setQueueClient)(queue);
        const job = { type: 'OCR', payload: { filePath: '/tmp/demo' } };
        const id = await (0, queue_js_1.enqueue)(job);
        (0, globals_1.expect)(typeof id).toBe('string');
        (0, globals_1.expect)(queue.list).toHaveLength(1);
        (0, globals_1.expect)(setSpy).toHaveBeenCalledWith(1);
        setSpy.mockRestore();
    });
    (0, globals_1.it)('throws when type is missing', async () => {
        (0, queue_js_1.setQueueClient)(new InMemoryQueue());
        await (0, globals_1.expect)((0, queue_js_1.enqueue)({ payload: {} })).rejects.toThrow('queue_job_missing_type');
    });
});
