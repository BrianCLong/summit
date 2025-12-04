import { PubSub } from 'graphql-subscriptions';
import { SubscriptionEngine } from '../subscriptionEngine';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SubscriptionEngine', () => {
  it('filters events using the provided predicate', async () => {
    const engine = new SubscriptionEngine({
      pubsub: new PubSub(),
      batchFlushIntervalMs: 10,
    });

    const iterator = engine.createFilteredAsyncIterator(
      'FILTER_TEST',
      (event) => event.metadata?.tenantId === 'tenant-a',
    );

    const received: any[] = [];
    const consumer = (async () => {
      for await (const event of iterator as any) {
        received.push(event.payload);
        if (received.length === 1) break;
      }
    })();

    await engine.publish(
      'FILTER_TEST',
      { value: 1 },
      { tenantId: 'tenant-a', type: 'FILTER_TEST' },
    );
    await engine.publish(
      'FILTER_TEST',
      { value: 2 },
      { tenantId: 'tenant-b', type: 'FILTER_TEST' },
    );

    await wait(25);

    expect(received).toEqual([{ value: 1 }]);
    if ((iterator as any).return) {
      await (iterator as any).return();
    }
    await consumer;
  });

  it('batches events using the configured window', async () => {
    const engine = new SubscriptionEngine({
      pubsub: new PubSub(),
      batchFlushIntervalMs: 10,
    });

    const iterator = engine.createBatchedAsyncIterator(
      'BATCH_TEST',
      () => true,
      { batchSize: 2, flushIntervalMs: 20 },
    );

    const batches: string[][] = [];
    const consumer = (async () => {
      for await (const batch of iterator as any) {
        batches.push(batch.map((event) => event.payload.id));
        if (batches.length === 2) break;
      }
    })();

    await engine.publish('BATCH_TEST', { id: 'a' }, { type: 'BATCH_TEST' });
    await engine.publish('BATCH_TEST', { id: 'b' }, { type: 'BATCH_TEST' });
    await engine.publish('BATCH_TEST', { id: 'c' }, { type: 'BATCH_TEST' });

    await wait(80);

    expect(batches[0]).toEqual(['a', 'b']);
    expect(batches[1]).toEqual(['c']);
    if ((iterator as any).return) {
      await (iterator as any).return();
    }
    await consumer;
  });
});
