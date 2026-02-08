import { Queue, Worker } from 'bullmq';
import { QueueFactory } from '../queue/queue.factory.js';
import { QueueNames } from './job.definitions.js';
// Use the real ingestion processor with OPA policy enforcement
import { ingestionProcessor } from './processors/ingestionProcessor.js';
import { reportProcessor } from './processors/report.processor.js';
import { analyticsProcessor } from './processors/analytics.processor.js';
import { notificationProcessor } from './processors/notification.processor.js';
import { webhookProcessor } from './processors/webhook.processor.js';
import { intentProcessor } from './processors/intent.processor.js';
import logger from '../utils/logger.js';

class JobManager {
  public queues: Record<string, Queue> = {};
  public workers: Record<string, Worker> = {};

  constructor() {
    this.initializeQueues();
    this.initializeWorkers();
  }

  private initializeQueues() {
    this.queues[QueueNames.INGESTION] = QueueFactory.createQueue(QueueNames.INGESTION);
    this.queues[QueueNames.REPORTS] = QueueFactory.createQueue(QueueNames.REPORTS);
    this.queues[QueueNames.ANALYTICS] = QueueFactory.createQueue(QueueNames.ANALYTICS);
    this.queues[QueueNames.NOTIFICATIONS] = QueueFactory.createQueue(QueueNames.NOTIFICATIONS);
    this.queues[QueueNames.WEBHOOKS] = QueueFactory.createQueue(QueueNames.WEBHOOKS);
    this.queues[QueueNames.INTENTS] = QueueFactory.createQueue(QueueNames.INTENTS);
  }

  private initializeWorkers() {
    // Workers with concurrency and scaling settings
    this.workers[QueueNames.INGESTION] = QueueFactory.createWorker(QueueNames.INGESTION, ingestionProcessor, { concurrency: 5 });
    this.workers[QueueNames.REPORTS] = QueueFactory.createWorker(QueueNames.REPORTS, reportProcessor, { concurrency: 2 });
    this.workers[QueueNames.ANALYTICS] = QueueFactory.createWorker(QueueNames.ANALYTICS, analyticsProcessor, { concurrency: 2 });
    this.workers[QueueNames.NOTIFICATIONS] = QueueFactory.createWorker(QueueNames.NOTIFICATIONS, notificationProcessor, { concurrency: 10 });
    this.workers[QueueNames.WEBHOOKS] = QueueFactory.createWorker(QueueNames.WEBHOOKS, webhookProcessor, { concurrency: 5 });
    this.workers[QueueNames.INTENTS] = QueueFactory.createWorker(QueueNames.INTENTS, intentProcessor, { concurrency: 5 });

    logger.info('Job Workers Initialized');
  }

  public getQueue(name: string): Queue | undefined {
    return this.queues[name];
  }

  public getAllQueues(): Queue[] {
    return Object.values(this.queues);
  }

  public async close() {
      await Promise.all(Object.values(this.queues).map(q => q.close()));
      await Promise.all(Object.values(this.workers).map(w => w.close()));
  }
}

export const jobManager = new JobManager();
