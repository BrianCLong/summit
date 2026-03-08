"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
vitest_1.vi.mock('@opentelemetry/api', () => ({
    metrics: {
        getMeter: () => ({
            createHistogram: () => ({ record: () => { } }),
            createCounter: () => ({ add: () => { } }),
        }),
    },
    trace: {
        getTracer: () => ({
            startSpan: () => ({
                setStatus: () => { },
                recordException: () => { },
                end: () => { },
            }),
        }),
    },
    SpanStatusCode: { OK: 1, ERROR: 2 },
}), { virtual: true });
vitest_1.vi.mock('kafkajs', () => ({
    Kafka: class {
        producer() {
            return {
                connect: vitest_1.vi.fn().mockResolvedValue(undefined),
                send: vitest_1.vi.fn().mockResolvedValue(undefined),
                disconnect: vitest_1.vi.fn().mockResolvedValue(undefined),
            };
        }
    },
}), { virtual: true });
vitest_1.vi.mock('pino', () => ({
    default: () => ({
        info: () => { },
        warn: () => { },
        error: () => { },
        debug: () => { },
    }),
}), { virtual: true });
const executor_js_1 = require("./executor.js");
class StubDlqPublisher {
    events = [];
    async publish(event) {
        this.events.push(event);
    }
}
(0, vitest_1.describe)('AdapterExecutor', () => {
    (0, vitest_1.it)('retries retryable failures and succeeds', async () => {
        const dlq = new StubDlqPublisher();
        const executor = new executor_js_1.AdapterExecutor({
            retryPolicy: {
                maxAttempts: 2,
                initialDelayMs: 1,
                maxDelayMs: 2,
                backoffMultiplier: 1,
            },
            dlqPublisher: dlq,
            defaultTimeoutMs: 50,
        });
        const handler = vitest_1.vi
            .fn()
            .mockRejectedValueOnce(Object.assign(new Error('transient'), { code: 'ECONNRESET' }))
            .mockResolvedValueOnce('ok');
        const result = await executor.execute({
            adapterId: 'adapter-1',
            operation: 'ping',
            execute: handler,
        });
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(result.attempts).toBe(2);
        (0, vitest_1.expect)(dlq.events).toHaveLength(0);
    });
    (0, vitest_1.it)('uses idempotency cache for repeated keys', async () => {
        const executor = new executor_js_1.AdapterExecutor({ idempotencyTtlMs: 10_000 });
        const handler = vitest_1.vi.fn().mockResolvedValue('once');
        const first = await executor.execute({
            adapterId: 'adapter-1',
            operation: 'dedupe',
            execute: handler,
            idempotencyKey: 'key-1',
        });
        const second = await executor.execute({
            adapterId: 'adapter-1',
            operation: 'dedupe',
            execute: handler,
            idempotencyKey: 'key-1',
        });
        (0, vitest_1.expect)(first.success).toBe(true);
        (0, vitest_1.expect)(second.fromCache).toBe(true);
        (0, vitest_1.expect)(handler).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('opens the circuit after repeated failures', async () => {
        const dlq = new StubDlqPublisher();
        const executor = new executor_js_1.AdapterExecutor({
            circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 10_000, halfOpenMaxSuccesses: 1 },
            dlqPublisher: dlq,
        });
        const failing = vitest_1.vi.fn().mockRejectedValue(new Error('hard-fail'));
        const first = await executor.execute({
            adapterId: 'adapter-1',
            operation: 'fail',
            execute: failing,
        });
        (0, vitest_1.expect)(first.success).toBe(false);
        const blocked = await executor.execute({
            adapterId: 'adapter-1',
            operation: 'fail',
            execute: failing,
        });
        (0, vitest_1.expect)(blocked.success).toBe(false);
        (0, vitest_1.expect)(blocked.attempts).toBe(0);
        (0, vitest_1.expect)(dlq.events.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('denies egress when target host is not allowlisted', async () => {
        const executor = new executor_js_1.AdapterExecutor();
        const handler = vitest_1.vi.fn().mockResolvedValue('ok');
        const result = await executor.execute({
            adapterId: 'adapter-1',
            operation: 'http-call',
            execute: handler,
            target: 'https://example.com/resource',
        });
        (0, vitest_1.expect)(result.success).toBe(false);
        (0, vitest_1.expect)(result.error?.message).toContain('Network egress denied');
        (0, vitest_1.expect)(handler).not.toHaveBeenCalled();
    });
});
