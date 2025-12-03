import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { pg } from '../db/pg.js';
import { webhookService } from './webhook.service.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface WebhookJobData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: any;
  eventType: string;
}

export const webhookWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    const { deliveryId, url, secret, payload, eventType } = job.data;

    const signature = webhookService.generateSignature(payload, secret);
    const startTime = Date.now();

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventType,
          'X-Webhook-Delivery': deliveryId,
          'User-Agent': 'Summit-Webhook-Service/1.0',
        },
        timeout: 10000, // 10s timeout
        validateStatus: () => true, // Capture all status codes
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      await pg.oneOrNone(
        `UPDATE webhook_deliveries
         SET status = $1,
             response_status = $2,
             response_body = $3,
             attempt_count = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          success ? 'success' : 'failed',
          response.status,
          JSON.stringify(response.data).substring(0, 10000), // Truncate large bodies
          job.attemptsMade, // This is the attempt number (1-based?) Check bullmq docs. attemptsMade is incremented before processing?
          // BullMQ: attemptsMade is 1 for first attempt, etc.
          // Actually, let's just use job.attemptsMade.
          deliveryId
        ]
      );

      if (!success) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

    } catch (error: any) {
        // Network error or timeout
        const errorMessage = error.message || 'Unknown error';

        await pg.oneOrNone(
            `UPDATE webhook_deliveries
             SET status = 'failed',
                 response_body = $1,
                 attempt_count = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [
              `Error: ${errorMessage}`,
              job.attemptsMade,
              deliveryId
            ]
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
