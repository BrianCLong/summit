"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("./index.js");
const metrics_queue_js_1 = require("../../../libs/ops/src/metrics-queue.js");
class MockRedis {
    data = {};
    async hset(key, value) {
        this.data[key] = { ...(this.data[key] ?? {}), ...value };
    }
    async expire(_key, _seconds) {
        return 1;
    }
}
(0, globals_1.describe)('worker handlers', () => {
    (0, globals_1.it)('processes OCR payload and records success', async () => {
        const ctx = { redis: new MockRedis() };
        const incSpy = globals_1.vi.spyOn(metrics_queue_js_1.queueProcessed, 'inc');
        const sample = Buffer.from('hello world').toString('base64');
        await (0, index_js_1.processPayload)(JSON.stringify({ id: '1', type: 'OCR', payload: { content: sample } }), ctx);
        (0, globals_1.expect)(ctx.redis.data['job:result:1'].status).toBe('completed');
        (0, globals_1.expect)(incSpy).toHaveBeenCalledWith({ status: 'success', type: 'OCR' });
        incSpy.mockRestore();
    });
    (0, globals_1.it)('records failure for unknown type', async () => {
        const ctx = { redis: new MockRedis() };
        const incSpy = globals_1.vi.spyOn(metrics_queue_js_1.queueProcessed, 'inc');
        await (0, globals_1.expect)((0, index_js_1.processPayload)(JSON.stringify({ id: '2', type: 'UNKNOWN', payload: {} }), ctx)).rejects.toThrow('unhandled_job_type:UNKNOWN');
        (0, globals_1.expect)(ctx.redis.data['job:result:2'].status).toBe('failed');
        (0, globals_1.expect)(incSpy).toHaveBeenCalledWith({ status: 'failure', type: 'UNKNOWN' });
        incSpy.mockRestore();
    });
});
