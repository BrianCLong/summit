"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
class NoopAdapter {
    async begin() { }
    async commit() { }
    async rollback() { }
}
(0, vitest_1.describe)('event log', () => {
    (0, vitest_1.it)('builds verifiable hash chain', () => {
        const log = new index_js_1.EventLog();
        log.append({
            id: '1',
            actor: 'tester',
            scope: 'case',
            timestamp: new Date().toISOString(),
            type: 'created',
            payload: { value: 1 },
        });
        log.append({
            id: '2',
            actor: 'tester',
            scope: 'case',
            timestamp: new Date().toISOString(),
            type: 'updated',
            payload: { value: 2 },
        });
        const result = log.verify('case');
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    (0, vitest_1.it)('fails verification when tampered', () => {
        const log = new index_js_1.EventLog();
        const event = log.append({
            id: '1',
            actor: 'tester',
            scope: 'case',
            timestamp: new Date().toISOString(),
            type: 'created',
            payload: { value: 1 },
        });
        event.payload.value = 999;
        const result = log.verify('case');
        (0, vitest_1.expect)(result.valid).toBe(false);
    });
});
(0, vitest_1.describe)('transactional boundary', () => {
    (0, vitest_1.it)('records and detects partial writes', async () => {
        const adapter = new NoopAdapter();
        const intents = new index_js_1.InMemoryIntentStore();
        const boundary = new index_js_1.TransactionalBoundary(adapter, intents);
        const detector = new index_js_1.PartialWriteDetector(intents);
        await (0, vitest_1.expect)(boundary.execute({ id: 'intent-1', scope: 'export', ttlMs: 1000 }, async () => {
            throw new Error('fail');
        })).rejects.toThrowError();
        const pending = await detector.detect(Date.now());
        (0, vitest_1.expect)(pending).toHaveLength(1);
    });
});
