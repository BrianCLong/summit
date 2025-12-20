// @ts-nocheck
import axios from 'axios';
import { WebhookService, backoffForAttempt, processDelivery } from '../service';
import { DeliveryStatus, WebhookEventType } from '../types';
import { signPayload, verifySignature } from '../signature';
import * as metrics from '../metrics';

jest.mock('bullmq');
jest.mock('../metrics', () => ({
  recordDeliveryMetric: jest.fn(),
}));

const mockQueueAdd = jest.fn();

jest.mock('../../queues/config', () => {
  const actual = jest.requireActual('../../queues/config');
  return {
    ...actual,
    addJob: (
      queueName: string,
      jobName: string,
      data: any,
      options: any,
    ) => mockQueueAdd(queueName, jobName, data, options),
  };
});

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

  it('reuses existing deliveries for idempotent retries instead of duplicating', async () => {
    mockRepository.getSubscriptionsForEvent.mockResolvedValue([
      {
        id: 'sub-22',
        target_url: 'https://hooks.example.com/retry',
        secret: 'retry-secret',
        tenant_id: 'tenant-1',
      },
    ]);
    mockRepository.findDeliveryByKey.mockResolvedValue({
      id: 'existing-delivery',
      status: DeliveryStatus.PENDING,
    });
    mockRepository.createDelivery.mockResolvedValue(null);

    const service = new WebhookService(mockRepository as any, axios as any);
    const jobs = await service.enqueueEvent(
      'tenant-1',
      WebhookEventType.CASE_CREATED,
      { id: 'case-22' },
      'idempo-retry',
    );

    expect(jobs).toHaveLength(1);
    expect(jobs[0].deliveryId).toBe('existing-delivery');
    expect(mockRepository.createDelivery).not.toHaveBeenCalled();
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'webhooks',
      'deliver-webhook',
      expect.objectContaining({ deliveryId: 'existing-delivery' }),
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
  const metricSpy = metrics.recordDeliveryMetric as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockReset();
    metricSpy.mockClear();
  });

  it('records success outcomes with latency and clears next attempts', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: { ok: true } });

    const job = {
      deliveryId: 'd-success',
      tenantId: 'tenant',
      subscriptionId: 'sub',
      eventType: WebhookEventType.CASE_CREATED,
      targetUrl: 'https://hooks.example.com',
      secret: 'secret',
      payload: { hello: 'world' },
      idempotencyKey: 'success-key',
    };

    await expect(processDelivery(job as any, 0, repository as any, axios as any)).resolves.toBe(
      'delivered',
    );

    expect(repository.markInProgress).toHaveBeenCalledWith('tenant', 'd-success');
    expect(repository.recordAttempt).toHaveBeenCalledWith(
      'tenant',
      'd-success',
      1,
      DeliveryStatus.SUCCEEDED,
      200,
      expect.stringContaining('ok'),
      undefined,
      expect.any(Number),
    );
    expect(repository.markSuccess).toHaveBeenCalledWith('tenant', 'd-success', 1);
    expect(metricSpy).toHaveBeenCalledWith(
      WebhookEventType.CASE_CREATED,
      'success',
      expect.any(Number),
    );
  });

  it('schedules retries with backoff and metrics on failure before poison threshold', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('network flake'));

    const job = {
      deliveryId: 'd-retry',
      tenantId: 'tenant',
      subscriptionId: 'sub',
      eventType: WebhookEventType.EXPORT_READY,
      targetUrl: 'https://hooks.example.com/retry',
      secret: 'secret',
      payload: { id: 'export-1' },
      idempotencyKey: 'retry-key',
    };

    await expect(processDelivery(job as any, 1, repository as any, axios as any)).rejects.toThrow(
      'network flake',
    );

    expect(repository.recordAttempt).toHaveBeenCalledWith(
      'tenant',
      'd-retry',
      2,
      DeliveryStatus.FAILED,
      undefined,
      undefined,
      expect.stringContaining('network flake'),
      expect.any(Number),
    );
    const failureCall = repository.markFailure.mock.calls[0];
    expect(failureCall[0]).toBe('tenant');
    expect(failureCall[1]).toBe('d-retry');
    expect(failureCall[2]).toBe(2);
    expect(failureCall[4]).toBe(false);
    expect(failureCall[5]).toBeInstanceOf(Date);
    expect(metricSpy).toHaveBeenCalledWith(
      WebhookEventType.EXPORT_READY,
      'failure',
      expect.any(Number),
    );
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
    expect(metricSpy).toHaveBeenCalledWith(
      WebhookEventType.INGEST_COMPLETED,
      'poison',
      expect.any(Number),
    );
  });
});
