import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { WebhookRepository } from './WebhookRepository';
import { DeliveryStatus, WebhookDelivery, WebhookMetrics } from './types';
import { WebhookService } from './WebhookService';

interface WorkerOptions {
  batchSize?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  signatureHeader?: string;
  idempotencyHeader?: string;
  eventHeader?: string;
  metrics?: WebhookMetrics;
  httpClient?: AxiosInstance;
}

export class NoopMetrics implements WebhookMetrics {
  recordDeadLetter(error: string): void {
    logger.warn('webhook.dead_letter', { error });
  }

  recordFailure(): void {
    logger.warn('webhook.delivery_failure');
  }

  recordSuccess(): void {
    logger.info('webhook.delivery_success');
  }
}

export class WebhookDeliveryWorker {
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly signatureHeader: string;
  private readonly idempotencyHeader: string;
  private readonly eventHeader: string;
  private readonly metrics: WebhookMetrics;
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly repository: WebhookRepository,
    private readonly service: WebhookService,
    options: WorkerOptions = {},
  ) {
    this.batchSize = options.batchSize ?? 10;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 5000;
    this.signatureHeader = options.signatureHeader ?? 'X-Webhook-Signature';
    this.idempotencyHeader = options.idempotencyHeader ?? 'Idempotency-Key';
    this.eventHeader = options.eventHeader ?? 'X-Webhook-Event';
    this.metrics = options.metrics ?? new NoopMetrics();
    this.httpClient = options.httpClient ?? axios.create();
  }

  async processOnce(): Promise<void> {
    const dueDeliveries = await this.repository.getDueDeliveries(this.batchSize);

    for (const delivery of dueDeliveries) {
      await this.processDelivery(delivery);
    }
  }

  private calculateBackoff(attemptNumber: number): number {
    const jitter = Math.random() * 0.25 + 0.75; // 25% jitter
    return Math.min(this.baseBackoffMs * 2 ** (attemptNumber - 1) * jitter, 15 * 60 * 1000);
  }

  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    const subscription = await this.repository.getSubscription(delivery.subscriptionId);

    if (!subscription || !subscription.isActive) {
      await this.repository.markDeliveryStatus(
        delivery.id,
        'dead',
        delivery.attemptCount,
        'Subscription missing or inactive',
        null,
      );
      this.metrics.recordDeadLetter('Subscription missing or inactive');
      return;
    }

    const payload = delivery.payload;
    const signature = this.service.generateSignature(payload, subscription.secret);
    const started = Date.now();
    let status: DeliveryStatus = 'succeeded';
    let error: string | undefined;
    let responseStatus: number | undefined;
    let responseBody: string | undefined;

    try {
      const response = await this.httpClient.post(subscription.targetUrl, payload, {
        headers: {
          [this.signatureHeader]: signature,
          [this.idempotencyHeader]: delivery.idempotencyKey,
          [this.eventHeader]: delivery.eventType,
        },
        timeout: 10000,
      });

      responseStatus = response.status;
      responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      if (response.status >= 400) {
        throw new Error(`Unexpected status code ${response.status}`);
      }

      this.metrics.recordSuccess(Date.now() - started);
      await this.repository.markDeliveryStatus(
        delivery.id,
        'succeeded',
        delivery.attemptCount + 1,
        undefined,
        null,
      );
    } catch (err: any) {
      const attemptNumber = delivery.attemptCount + 1;
      status = attemptNumber >= this.maxAttempts ? 'dead' : 'failed';
      error = err?.message || 'Webhook delivery failed';

      if (err?.response) {
        responseStatus = err.response.status;
        responseBody = typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data);
      }

      const backoffMs = this.calculateBackoff(attemptNumber);
      const nextAttempt = status === 'failed' ? new Date(Date.now() + backoffMs) : null;

      await this.repository.markDeliveryStatus(
        delivery.id,
        status,
        attemptNumber,
        error,
        nextAttempt,
      );

      if (status === 'dead') {
        this.metrics.recordDeadLetter(error ?? 'Unknown error');
        logger.error('webhook.dead_letter', { deliveryId: delivery.id, error });
      } else {
        this.metrics.recordFailure(Date.now() - started);
        logger.warn('webhook.delivery_retry', {
          deliveryId: delivery.id,
          attemptNumber,
          nextAttempt,
        });
      }
    } finally {
      const duration = Date.now() - started;
      await this.repository.recordAttempt({
        deliveryId: delivery.id,
        responseStatus,
        responseBody,
        error,
        durationMs: duration,
        attemptNumber: delivery.attemptCount + 1,
      });
    }
  }
}
