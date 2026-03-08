"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const subscriptionEngine_js_1 = require("../subscriptionEngine.js");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(0, globals_1.describe)('SubscriptionEngine', () => {
    (0, globals_1.it)('filters events using the provided predicate', async () => {
        const engine = new subscriptionEngine_js_1.SubscriptionEngine({
            pubsub: new graphql_subscriptions_1.PubSub(),
            batchFlushIntervalMs: 10,
        });
        const iterator = engine.createFilteredAsyncIterator('FILTER_TEST', (event) => event.metadata?.tenantId === 'tenant-a');
        const received = [];
        const consumer = (async () => {
            for await (const event of iterator) {
                received.push(event.payload);
                if (received.length === 1)
                    break;
            }
        })();
        await engine.publish('FILTER_TEST', { value: 1 }, { tenantId: 'tenant-a', type: 'FILTER_TEST' });
        await engine.publish('FILTER_TEST', { value: 2 }, { tenantId: 'tenant-b', type: 'FILTER_TEST' });
        await wait(25);
        (0, globals_1.expect)(received).toEqual([{ value: 1 }]);
        if (iterator.return) {
            await iterator.return();
        }
        await consumer;
    });
    (0, globals_1.it)('batches events using the configured window', async () => {
        const engine = new subscriptionEngine_js_1.SubscriptionEngine({
            pubsub: new graphql_subscriptions_1.PubSub(),
            batchFlushIntervalMs: 10,
        });
        const iterator = engine.createBatchedAsyncIterator('BATCH_TEST', () => true, { batchSize: 2, flushIntervalMs: 20 });
        const batches = [];
        const consumer = (async () => {
            for await (const batch of iterator) {
                batches.push(batch.map((event) => event.payload.id));
                if (batches.length === 2)
                    break;
            }
        })();
        await engine.publish('BATCH_TEST', { id: 'a' }, { type: 'BATCH_TEST' });
        await engine.publish('BATCH_TEST', { id: 'b' }, { type: 'BATCH_TEST' });
        await engine.publish('BATCH_TEST', { id: 'c' }, { type: 'BATCH_TEST' });
        await wait(80);
        (0, globals_1.expect)(batches[0]).toEqual(['a', 'b']);
        (0, globals_1.expect)(batches[1]).toEqual(['c']);
        if (iterator.return) {
            await iterator.return();
        }
        await consumer;
    });
});
