import { WebhookAdapter, WebhookRequest } from '../webhook';
import { jest } from '@jest/globals';

describe('WebhookAdapter SLO', () => {
  let adapter: WebhookAdapter;

  beforeEach(() => {
    adapter = new WebhookAdapter({
      config: {
        name: 'test-webhook',
        enabled: true,
        tenant_id: 'test-tenant',
        source_type: 'webhook',
        path: '/webhook',
        method: 'POST',
        backpressure: { max_concurrency: 5 }
      } as any,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any,
      checkpointStore: { get: jest.fn(), set: jest.fn() } as any,
      dlqStore: { add: jest.fn() } as any,
    });

    // Mock protected processRecord to be slow
    // @ts-ignore
    adapter.processRecord = jest.fn().mockImplementation(async () => {
      // Simulate slow processing (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  afterEach(async () => {
    // Stop adapter to clear intervals/loops
    await adapter.stop();
  });

  it('should respond within 250ms even if processing is slow', async () => {
    await adapter.start(); // Start processor

    const request: WebhookRequest = {
      headers: {},
      body: { id: '1', type: 'test', _type: 'test_entity', _id: '123' },
      method: 'POST',
      path: '/webhook'
    };

    const start = Date.now();
    const response = await adapter.handleRequest(request);
    const duration = Date.now() - start;

    expect(response.status).toBe(202);
    // 250ms SLO
    expect(duration).toBeLessThan(250);
    expect(response.body).toEqual(expect.objectContaining({ status: 'accepted', queued: 1 }));
  });

  it('should reject when queue is full', async () => {
     // @ts-ignore
     adapter.maxQueueSize = 1;
     // @ts-ignore
     adapter.queue = [{ event_id: '1' } as any]; // Fill queue

     const request: WebhookRequest = {
      headers: {},
      body: { id: '2', type: 'test', _type: 'test_entity', _id: '456' },
      method: 'POST',
      path: '/webhook'
    };

    const response = await adapter.handleRequest(request);
    expect(response.status).toBe(503);
    expect(response.body).toEqual(expect.objectContaining({ error: 'Service temporarily unavailable (queue full)' }));
  });
});
