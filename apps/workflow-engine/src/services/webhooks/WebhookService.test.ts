import { newDb } from 'pg-mem';
import { WebhookRepository } from './WebhookRepository';
import { WebhookDeliveryWorker } from './WebhookDeliveryWorker';
import { WebhookService } from './WebhookService';
import { WebhookMetrics } from './types';

class InMemoryMetrics implements WebhookMetrics {
  successes: number = 0;
  failures: number = 0;
  deadLetters: number = 0;
  latencies: number[] = [];

  recordSuccess(durationMs: number): void {
    this.successes++;
    this.latencies.push(durationMs);
  }

  recordFailure(durationMs: number): void {
    this.failures++;
    this.latencies.push(durationMs);
  }

  recordDeadLetter(_error?: string): void {
    this.deadLetters++;
  }
}

function buildHarness() {
  const db = newDb();
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();
  const repository = new WebhookRepository(pool);
  const service = new WebhookService(repository);
  const metrics = new InMemoryMetrics();

  return { repository, service, metrics };
}

describe('Webhook HMAC and delivery pipeline', () => {
  it('validates webhook signatures with HMAC', async () => {
    const { repository, service } = buildHarness();
    await repository.ensureSchema();

    const payload = { hello: 'world' };
    const secret = 'super-secret';
    const signature = service.generateSignature(payload, secret);

    expect(service.validateSignature(payload, secret, signature)).toBe(true);
    expect(service.validateSignature(payload, secret, 'deadbeef')).toBe(false);
  });

  it('retries with backoff until success and preserves idempotency', async () => {
    const { repository, service, metrics } = buildHarness();
    await repository.ensureSchema();

    const subscription = await service.provisionSubscription({
      tenantId: 'tenant-1',
      targetUrl: 'https://example.test/webhook',
      secret: 'abc',
      eventTypes: ['case.created'],
    });

    const httpClient = {
      post: jest
        .fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockRejectedValueOnce(new Error('second failure'))
        .mockResolvedValue({ status: 200, data: { ok: true } }),
    } as any;

    const worker = new WebhookDeliveryWorker(repository, service, {
      httpClient,
      metrics,
      baseBackoffMs: 10,
      maxAttempts: 3,
    });

    await service.queueEventDeliveries({
      tenantId: 'tenant-1',
      eventType: 'case.created',
      payload: { caseId: '123' },
      idempotencyKey: 'event-123',
    });

    await worker.processOnce();
    let delivery = await repository.getDueDeliveries(1);
    expect(delivery[0].status).toBe('failed');
    expect(delivery[0].attemptCount).toBe(1);

    await repository.overrideNextAttempt(delivery[0].id, new Date());
    await worker.processOnce();
    delivery = await repository.getDueDeliveries(1);
    expect(delivery[0].status).toBe('failed');
    expect(delivery[0].attemptCount).toBe(2);

    await repository.overrideNextAttempt(delivery[0].id, new Date());
    await worker.processOnce();

    const finalDelivery = await repository.getDelivery(delivery[0].id);
    expect(finalDelivery?.status).toBe('succeeded');
    expect(metrics.successes).toBe(1);
    expect(metrics.failures).toBeGreaterThanOrEqual(1);

    const deliveryCount = await repository.countDeliveries();
    expect(deliveryCount).toBe(1);
  });

  it('moves poison messages to dead-letter after max attempts', async () => {
    const { repository, service, metrics } = buildHarness();
    await repository.ensureSchema();

    const subscription = await service.provisionSubscription({
      tenantId: 'tenant-99',
      targetUrl: 'https://example.test/webhook',
      secret: 'abc',
      eventTypes: ['export.ready'],
    });

    const httpClient = {
      post: jest.fn().mockRejectedValue(new Error('boom')),
    } as any;

    const worker = new WebhookDeliveryWorker(repository, service, {
      httpClient,
      metrics,
      baseBackoffMs: 5,
      maxAttempts: 2,
    });

    await service.queueEventDeliveries({
      tenantId: 'tenant-99',
      eventType: 'export.ready',
      payload: { exportId: '777' },
      idempotencyKey: 'export-777',
    });

    await worker.processOnce();
    let delivery = await repository.getDueDeliveries(1);
    expect(delivery[0].status).toBe('failed');

    await repository.overrideNextAttempt(delivery[0].id, new Date());
    await worker.processOnce();

    const final = await repository.getDelivery(delivery[0].id);
    expect(final?.status).toBe('dead');
    const attempts = await repository.listAttempts(delivery[0].id);
    expect(attempts).toHaveLength(2);
    expect(metrics.deadLetters).toBe(1);
  });
});
