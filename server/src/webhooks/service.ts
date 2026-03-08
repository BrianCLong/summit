// @ts-nocheck
import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger.js';
import { addJob, queueRegistry, QueueName } from '../queues/config.js';
import { recordDeliveryMetric } from './metrics.js';
import { webhookRepository, WebhookRepository } from './repository.js';
import { signPayload } from './signature.js';
import {
  DeliveryStatus,
  DeliveryJobData,
  WebhookEventType,
} from './types.js';

const MAX_ATTEMPTS = parseInt(process.env.WEBHOOK_MAX_ATTEMPTS || '5', 10);
const INITIAL_BACKOFF_MS = parseInt(process.env.WEBHOOK_BACKOFF_MS || '2000', 10);

export class WebhookService {
  constructor(
    private repository: WebhookRepository = webhookRepository,
    private httpClient: AxiosInstance = axios,
  ) {}

  async enqueueEvent(
    tenantId: string,
    eventType: WebhookEventType,
    payload: any,
    idempotencyKey: string,
  ) {
    const subscriptions = await this.repository.getSubscriptionsForEvent(
      tenantId,
      eventType,
    );

    if (!subscriptions.length) {
      logger.warn('No webhook subscriptions registered', {
        tenantId,
        eventType,
      });
      return [];
    }

    const jobs: DeliveryJobData[] = [];
    for (const subscription of subscriptions) {
      const existing = await this.repository.findDeliveryByKey(
        tenantId,
        subscription.id,
        idempotencyKey,
      );

      if (existing && existing.status === DeliveryStatus.SUCCEEDED) {
        logger.info('Skipping duplicate webhook delivery', {
          tenantId,
          subscriptionId: subscription.id,
          idempotencyKey,
        });
        continue;
      }

      const delivery =
        existing ??
        (await this.repository.createDelivery({
          tenantId,
          subscriptionId: subscription.id,
          eventType,
          payload,
          idempotencyKey,
          nextAttemptAt: new Date(),
        }));

      const job: DeliveryJobData = {
        deliveryId: delivery.id,
        tenantId,
        subscriptionId: subscription.id,
        eventType,
        targetUrl: subscription.target_url,
        secret: subscription.secret,
        payload,
        idempotencyKey,
      };

      jobs.push(job);
      await addJob(
        QueueName.WEBHOOKS,
        'deliver-webhook',
        job,
        {
          attempts: MAX_ATTEMPTS,
          delay: 0,
          removeOnFail: false,
          priority: undefined,
        },
      );
    }

    return jobs;
  }
}

export function backoffForAttempt(attempt: number): number {
  return INITIAL_BACKOFF_MS * Math.pow(2, Math.max(0, attempt - 1));
}

export async function processDelivery(
  job: DeliveryJobData,
  attemptsMade: number,
  repository: WebhookRepository = webhookRepository,
  httpClient: AxiosInstance = axios,
): Promise<'delivered' | 'poisoned'> {
  const started = Date.now();
  await repository.markInProgress(job.tenantId, job.deliveryId);

  const timestamp = Date.now();
  const signature = signPayload(
    job.secret,
    job.payload,
    timestamp,
    job.idempotencyKey,
  );

  const attemptNumber = attemptsMade + 1;
  const headers = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': signature,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-Id': job.deliveryId,
    'Idempotency-Key': job.idempotencyKey,
    'X-Tenant-Id': job.tenantId,
    'X-Webhook-Event': job.eventType,
  };

  try {
    const response = await httpClient.post(job.targetUrl, job.payload, {
      headers,
      timeout: 10000,
      validateStatus: () => true,
    });

    await repository.recordAttempt(
      job.tenantId,
      job.deliveryId,
      attemptNumber,
      DeliveryStatus.SUCCEEDED,
      response.status,
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data ?? {}),
      undefined,
      Date.now() - started,
    );

    if (response.status >= 200 && response.status < 300) {
      await repository.markSuccess(job.tenantId, job.deliveryId, attemptNumber);
      recordDeliveryMetric(job.eventType, 'success', (Date.now() - started) / 1000);
      return 'delivered';
    }

    throw new Error(`Non-success status ${response.status}`);
  } catch (error: any) {
    const poison = attemptNumber >= MAX_ATTEMPTS;
    const backoffMs = backoffForAttempt(attemptNumber);
    const errorMessage = error?.message || 'Webhook delivery failed';

    await repository.recordAttempt(
      job.tenantId,
      job.deliveryId,
      attemptNumber,
      poison ? DeliveryStatus.POISONED : DeliveryStatus.FAILED,
      undefined,
      undefined,
      errorMessage,
      Date.now() - started,
    );

    await repository.markFailure(
      job.tenantId,
      job.deliveryId,
      attemptNumber,
      errorMessage,
      poison,
      poison ? undefined : new Date(Date.now() + backoffMs),
    );

    recordDeliveryMetric(job.eventType, poison ? 'poison' : 'failure');

    if (poison) {
      logger.error('Webhook delivery poisoned, moving to dead letter', {
        deliveryId: job.deliveryId,
        tenantId: job.tenantId,
        attemptNumber,
      });
      return 'poisoned';
    }

    throw error;
  }
}

export function registerWebhookWorker() {
  return queueRegistry.registerWorker(
    QueueName.WEBHOOKS,
    async (bullJob) => {
      return processDelivery(bullJob.data as DeliveryJobData, bullJob.attemptsMade);
    },
    {
      concurrency: parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '5', 10),
      backoffStrategy: (attempts) => backoffForAttempt(attempts + 1),
    },
  );
}
