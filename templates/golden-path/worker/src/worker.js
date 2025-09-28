import { Queue, Worker } from 'bullmq';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const connection = {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379)
  }
};

export const queue = new Queue('{{SERVICE_SLUG}}', connection);

export const worker = new Worker(
  '{{SERVICE_SLUG}}',
  async job => {
    logger.info({ jobId: job.id, name: job.name }, 'processing job');
    return job.data;
  },
  connection
);

worker.on('completed', job => {
  logger.info({ jobId: job.id }, 'job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'job failed');
});

process.on('SIGTERM', async () => {
  await worker.close();
  await queue.close();
  logger.info('worker shut down gracefully');
  process.exit(0);
});
