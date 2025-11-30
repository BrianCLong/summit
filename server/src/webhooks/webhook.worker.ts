import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { pg } from '../db/pg.js';
import { webhookService } from './webhook.service.js';
import { logger } from '../logger.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface WebhookJobData {
  deliveryId: string;
  webhookId: string;
  tenantId: string;
  url: string;
  secret: string;
  payload: any;
  eventType: string;
  triggerType?: 'event' | 'test';
}

export const webhookWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    const { deliveryId, url, secret, payload, eventType, tenantId } = job.data;

    const { signature, timestamp } = webhookService.generateSignature(payload, secret);
    const startTime = Date.now();
    const attemptNumber = (job.attemptsMade || 0) + 1;
    const maxAttempts = job.opts.attempts || 1;
    const baseDelay =
      typeof job.opts.backoff === 'object' && job.opts.backoff
        ? job.opts.backoff.delay || 1000
        : 1000;

    const truncateBody = (body: any) => {
      if (body === undefined || body === null) return body as any;
      try {
        return JSON.stringify(body).substring(0, 10000);
      } catch {
        return String(body).substring(0, 10000);
      }
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Event': eventType,
          'X-Webhook-Delivery': deliveryId,
          'User-Agent': 'Summit-Webhook-Service/1.0',
        },
        timeout: 10000, // 10s timeout
        validateStatus: () => true, // Capture all status codes
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;
      const willRetry = !success && attemptNumber < maxAttempts;
      const nextRetryAt =
        !success && willRetry
          ? new Date(Date.now() + baseDelay * Math.pow(2, attemptNumber - 1))
          : null;
      const status = success ? 'success' : willRetry ? 'pending' : 'failed';

      await pg.oneOrNone(
        `UPDATE webhook_deliveries
         SET status = $1,
             response_status = $2,
             response_body = $3,
             attempt_count = $4,
             next_retry_at = $5,
             last_attempt_at = NOW(),
             last_error = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [
          status,
          response.status,
          truncateBody(response.data),
          attemptNumber,
          nextRetryAt,
          success ? null : `HTTP ${response.status}`,
          deliveryId,
        ],
        { tenantId }
      );

      await pg.oneOrNone(
        `INSERT INTO webhook_delivery_attempts
         (delivery_id, webhook_id, tenant_id, attempt_number, status, response_status, response_body, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          deliveryId,
          job.data.webhookId,
          tenantId,
          attemptNumber,
          status,
          response.status,
          truncateBody(response.data),
          duration,
        ],
        { tenantId }
      );

      if (!success) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error?.message || 'Unknown error';
      const responseStatus = error.response?.status;
      const responseBody = truncateBody(error.response?.data || errorMessage);
      const willRetry = attemptNumber < maxAttempts;
      const nextRetryAt = willRetry
        ? new Date(Date.now() + baseDelay * Math.pow(2, attemptNumber - 1))
        : null;
      const status = willRetry ? 'pending' : 'failed';

      await pg.oneOrNone(
        `UPDATE webhook_deliveries
         SET status = $1,
             response_status = $2,
             response_body = $3,
             attempt_count = $4,
             next_retry_at = $5,
             last_attempt_at = NOW(),
             last_error = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [
          status,
          responseStatus,
          responseBody,
          attemptNumber,
          nextRetryAt,
          errorMessage,
          deliveryId,
        ],
        { tenantId }
      );

      await pg.oneOrNone(
        `INSERT INTO webhook_delivery_attempts
         (delivery_id, webhook_id, tenant_id, attempt_number, status, response_status, response_body, error_message, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          deliveryId,
          job.data.webhookId,
          tenantId,
          attemptNumber,
          status,
          responseStatus,
          responseBody,
          errorMessage,
          duration,
        ],
        { tenantId }
      );

      throw error; // Rethrow to trigger retry
    }
  },
  {
    connection,
    concurrency: 10,
  }
);

webhookWorker.on('completed', (job) => {
  logger.info(`Webhook delivery ${job.data.deliveryId} completed`);
});

webhookWorker.on('failed', (job, err) => {
  logger.error(`Webhook delivery ${job?.data.deliveryId} failed: ${err.message}`);
});
