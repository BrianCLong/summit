import { Queue, Worker, Job } from 'bullmq';
import { NotificationService } from '../NotificationService.js';
import { NotificationPayload, NotificationResult } from '../types.js';
import pino from 'pino';

const logger = pino({ name: 'NotificationQueue' });

const QUEUE_NAME = 'notifications';

export class NotificationQueue {
  private queue: Queue;
  private worker: Worker;
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService, connection: any) {
    this.notificationService = notificationService;

    // Use duplicated connection for queue if possible, or just pass it.
    // BullMQ manages connections well if passed properly, but Worker needs a dedicated blocking connection.
    // Ideally we pass connection configuration or a dedicated client.
    // If `connection` is an ioredis instance, we should duplicate it for the worker.

    const queueConnection = connection.duplicate ? connection.duplicate() : connection;
    const workerConnection = connection.duplicate ? connection.duplicate() : connection;

    this.queue = new Queue(QUEUE_NAME, { connection: queueConnection });

    this.worker = new Worker(QUEUE_NAME, async (job: Job<NotificationPayload>) => {
      try {
        logger.info({ jobId: job.id }, 'Processing notification job');
        const results = await this.notificationService.send(job.data);
        return results;
      } catch (error: any) {
        logger.error({ jobId: job.id, error: error.message }, 'Failed to process notification job');
        throw error;
      }
    }, { connection: workerConnection });

    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Notification job completed');
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Notification job failed');
    });
  }

  async add(payload: NotificationPayload) {
    return this.queue.add('send-notification', payload, {
      priority: this.getPriority(payload),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  private getPriority(payload: NotificationPayload): number {
    // Lower number is higher priority in BullMQ? No, default is FIFO.
    // BullMQ supports priority. 1 is highest priority?
    // "Jobs with higher priority will be processed before jobs with lower priority."
    // So HIGH = 10, LOW = 1.

    switch (payload.priority) {
      case 'CRITICAL': return 100;
      case 'HIGH': return 50;
      case 'MEDIUM': return 10;
      case 'LOW': return 1;
      default: return 10;
    }
  }

  async close() {
    await this.queue.close();
    await this.worker.close();
  }
}
