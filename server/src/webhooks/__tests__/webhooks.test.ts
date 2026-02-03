import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { DeliveryStatus, WebhookEventType } from '../types.js';

// Mock functions declared before mocks
const mockQueueAdd = jest.fn();
const mockRecordDeliveryMetric = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('bullmq', () => ({
  Queue: jest.fn(),
  Worker: jest.fn(),
}));

jest.unstable_mockModule('../metrics', () => ({
  recordDeliveryMetric: mockRecordDeliveryMetric,
}));

jest.unstable_mockModule('../../queues/config', () => ({
  addJob: (
    queueName: string,
    jobName: string,
    data: any,
    options: any,
  ) => mockQueueAdd(queueName, jobName, data, options),
}));

// Dynamic imports AFTER mocks are set up
const { WebhookService, backoffForAttempt, processDelivery } = await import('../service.js');
const { signPayload, verifySignature } = await import('../signature.js');
const { recordDeliveryMetric } = await import('../metrics.js');

describe('webhook signatures', () => {
  it('validates HMAC signatures', () => {
    const secret = 'top-secret';
    const payload = { example: true };
    const timestamp = 1700000000;
    const idempotencyKey = 'abc-123';

    const signature = signPayload(secret, payload, timestamp, idempotencyKey);
    expect(
      verifySignature(secret, payload, timestamp, idempotencyKey, signature),
    ).toBe(true);
    expect(
      verifySignature(secret, payload, timestamp + 1, idempotencyKey, signature),
    ).toBe(false);
  });
});

describe('WebhookService', () => {
  const mockRepository = {
    getSubscriptionsForEvent: jest.fn(),
    findDeliveryByKey: jest.fn(),
    createDelivery: jest.fn(),
    markInProgress: jest.fn(),
    markSuccess: jest.fn(),
    markFailure: jest.fn(),
    recordAttempt: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips duplicate deliveries for the same idempotency key', async () => {
    mockRepository.getSubscriptionsForEvent.mockResolvedValue([
      { id: 'sub-1', target_url: 'https://example.com', secret: 's', tenant_id: 't' },
    ]);
    mockRepository.findDeliveryByKey.mockResolvedValue({
      id: 'delivery-1',
      status: DeliveryStatus.SUCCEEDED,
    });

    const service = new WebhookService(mockRepository as any, axios as any);
    const jobs = await service.enqueueEvent(
      'tenant-1',
      WebhookEventType.CASE_CREATED,
      { hello: 'world' },
      'dup-key',
    );

    expect(jobs).toHaveLength(0);
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('enqueues deliveries with exponential backoff settings', async () => {
    mockRepository.getSubscriptionsForEvent.mockResolvedValue([
      {
        id: 'sub-1',
        target_url: 'https://hooks.example.com',
        secret: 'secret',
        tenant_id: 'tenant-1',
      },
    ]);
    mockRepository.findDeliveryByKey.mockResolvedValue(null);
    mockRepository.createDelivery.mockResolvedValue({
      id: 'delivery-xyz',
    });

    const service = new WebhookService(mockRepository as any, axios as any);
    const jobs = await service.enqueueEvent(
      'tenant-1',
      WebhookEventType.EXPORT_READY,
      { job: '123' },
      'unique-key',
    );

    expect(jobs).toHaveLength(1);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'webhooks',
      'deliver-webhook',
      expect.objectContaining({ deliveryId: 'delivery-xyz' }),
      expect.objectContaining({ attempts: 5 }),
    );
    expect(backoffForAttempt(3)).toBe(8000);
  });

  it('reuses in-flight deliveries for matching idempotency keys', async () => {
    mockRepository.getSubscriptionsForEvent.mockResolvedValue([
      {
        id: 'sub-77',
        target_url: 'https://hooks.example.net',
        secret: 'secret',
        tenant_id: 'tenant-99',
      },
    ]);

    mockRepository.findDeliveryByKey.mockResolvedValue({
      id: 'delivery-existing',
      status: DeliveryStatus.PENDING,
    });

    const service = new WebhookService(mockRepository as any, axios as any);
    const jobs = await service.enqueueEvent(
      'tenant-99',
      WebhookEventType.EXPORT_READY,
      { id: 'file-1' },
      'idempo-key',
    );

    expect(jobs).toHaveLength(1);
    expect(mockRepository.createDelivery).not.toHaveBeenCalled();
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'webhooks',
      'deliver-webhook',
      expect.objectContaining({ deliveryId: 'delivery-existing' }),
      expect.any(Object),
    );
  });
});

describe('processDelivery', () => {
  const repository = {
    markInProgress: jest.fn(),
    recordAttempt: jest.fn(),
    markSuccess: jest.fn(),
    markFailure: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockReset();
  });

  it('marks poison messages after max attempts', async () => {
    const targetUrl = 'https://webhooks.example.com/';
    jest.spyOn(axios, 'post').mockResolvedValue({ status: 500, data: {} });

    const job = {
      deliveryId: 'd1',
      tenantId: 'tenant',
      subscriptionId: 'sub',
      eventType: WebhookEventType.INGEST_COMPLETED,
      targetUrl,
      secret: 'secret',
      payload: { ok: true },
      idempotencyKey: 'idempo',
    };

    const result = await processDelivery(job as any, 4, repository as any, axios as any);

    expect(result).toBe('poisoned');
    expect(repository.recordAttempt).toHaveBeenCalledWith(
      'tenant',
      'd1',
      5,
      DeliveryStatus.POISONED,
      undefined,
      undefined,
      expect.stringContaining('Non-success status'),
      expect.any(Number),
    );
    expect(repository.markFailure).toHaveBeenCalledWith(
      'tenant',
      'd1',
      5,
      expect.stringContaining('Non-success status'),
      true,
      undefined,
    );
  });

  it('records retry metadata and metrics when delivery fails but is retryable', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({ status: 500, data: {} });

    const job = {
      deliveryId: 'd2',
      tenantId: 'tenant',
      subscriptionId: 'sub',
      eventType: WebhookEventType.CASE_CREATED,
      targetUrl: 'https://target.example.com',
      secret: 'secret',
      payload: { caseId: 'abc' },
      idempotencyKey: 'retry-key',
    } as any;

    await expect(
      processDelivery(job, 1, repository as any, axios as any),
    ).rejects.toThrow('Non-success status 500');

    expect(repository.recordAttempt).toHaveBeenCalledWith(
      'tenant',
      'd2',
      2,
      DeliveryStatus.FAILED,
      undefined,
      undefined,
      expect.stringContaining('Non-success status'),
      expect.any(Number),
    );

    const [, , , , , nextAttemptAt] =
      (repository.markFailure as jest.Mock).mock.calls[0];

    expect(repository.markFailure).toHaveBeenCalledWith(
      'tenant',
      'd2',
      2,
      expect.stringContaining('Non-success status'),
      false,
      expect.any(Date),
    );

    expect((nextAttemptAt as Date).getTime()).toBeGreaterThan(Date.now());
    expect(recordDeliveryMetric).toHaveBeenCalledWith(
      WebhookEventType.CASE_CREATED,
      'failure',
    );
  });

  it('records success metrics and marks deliveries complete', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({ status: 201, data: { ok: true } });

    const job = {
      deliveryId: 'd3',
      tenantId: 'tenant',
      subscriptionId: 'sub',
      eventType: WebhookEventType.EXPORT_READY,
      targetUrl: 'https://target.example.com',
      secret: 'secret',
      payload: { exportId: 'xyz' },
      idempotencyKey: 'ok',
    } as any;

    const result = await processDelivery(job, 0, repository as any, axios as any);

    expect(result).toBe('delivered');
    expect(repository.markSuccess).toHaveBeenCalledWith('tenant', 'd3', 1);
    expect(recordDeliveryMetric).toHaveBeenCalledWith(
      WebhookEventType.EXPORT_READY,
      'success',
      expect.any(Number),
    );
  });
});
