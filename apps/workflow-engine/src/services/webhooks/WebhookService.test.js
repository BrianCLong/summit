"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_mem_1 = require("pg-mem");
const WebhookRepository_1 = require("./WebhookRepository");
const WebhookDeliveryWorker_1 = require("./WebhookDeliveryWorker");
const WebhookService_1 = require("./WebhookService");
class InMemoryMetrics {
    successes = 0;
    failures = 0;
    deadLetters = 0;
    latencies = [];
    recordSuccess(durationMs) {
        this.successes++;
        this.latencies.push(durationMs);
    }
    recordFailure(durationMs) {
        this.failures++;
        this.latencies.push(durationMs);
    }
    recordDeadLetter(_error) {
        this.deadLetters++;
    }
}
function buildHarness() {
    const db = (0, pg_mem_1.newDb)();
    const adapter = db.adapters.createPg();
    const pool = new adapter.Pool();
    const repository = new WebhookRepository_1.WebhookRepository(pool);
    const service = new WebhookService_1.WebhookService(repository);
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
    // Skip: pg-mem doesn't support array containment operators (@>)
    it.skip('retries with backoff until success and preserves idempotency', async () => {
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
        };
        const worker = new WebhookDeliveryWorker_1.WebhookDeliveryWorker(repository, service, {
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
    // Skip: pg-mem doesn't support array containment operators (@>)
    it.skip('moves poison messages to dead-letter after max attempts', async () => {
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
        };
        const worker = new WebhookDeliveryWorker_1.WebhookDeliveryWorker(repository, service, {
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
