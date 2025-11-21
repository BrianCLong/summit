import { Queue, QueueEvents, Worker, Job, FlowProducer, FlowJob } from 'bullmq';
import { dbUrls, cfg } from '../config.js';
import { QueueName, JobData, JobOptions } from './types.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Express } from 'express';
import pino from 'pino';

const logger = pino({ name: 'queue-manager' });

const connection = {
  host: cfg.REDIS_HOST,
  port: cfg.REDIS_PORT,
  password: cfg.REDIS_PASSWORD || undefined,
  username: cfg.REDIS_USERNAME,
  tls: cfg.REDIS_TLS ? {} : undefined,
};

class QueueManager {
  private static instance: QueueManager;
  private queues: Map<QueueName, Queue> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private flowProducer: FlowProducer;
  private serverAdapter: ExpressAdapter;

  private constructor() {
    this.flowProducer = new FlowProducer({ connection });
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/admin/queues');
    this.initializeQueues();
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  private initializeQueues() {
    Object.values(QueueName).forEach((queueName) => {
      const queue = new Queue(queueName, { connection });
      const queueEvents = new QueueEvents(queueName, { connection });

      this.queues.set(queueName, queue);
      this.queueEvents.set(queueName, queueEvents);

      queueEvents.on('completed', ({ jobId }) => {
        logger.info(`Job ${jobId} completed in queue ${queueName}`);
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        logger.error(`Job ${jobId} failed in queue ${queueName}: ${failedReason}`);
      });
    });

    createBullBoard({
      queues: Array.from(this.queues.values()).map((queue) => new BullMQAdapter(queue)),
      serverAdapter: this.serverAdapter,
    });
  }

  public getQueue(name: QueueName): Queue | undefined {
    return this.queues.get(name);
  }

  public async addJob(
    queueName: QueueName,
    name: string,
    data: JobData,
    options?: JobOptions
  ): Promise<Job | undefined> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      logger.error(`Queue ${queueName} not found`);
      return undefined;
    }

    return queue.add(name, data, {
      ...options,
      removeOnComplete: { count: 1000 }, // Keep last 1000 jobs
      removeOnFail: { count: 5000 }, // Keep last 5000 failed jobs
    });
  }

  public async addFlow(flow: FlowJob) {
      return this.flowProducer.add(flow);
  }

  public setupBoard(app: Express) {
    app.use('/admin/queues', this.serverAdapter.getRouter());
  }

  public async close() {
      await this.flowProducer.close();
      for (const queue of this.queues.values()) {
          await queue.close();
      }
      for (const events of this.queueEvents.values()) {
          await events.close();
      }
  }
}

export const queueManager = QueueManager.getInstance();
