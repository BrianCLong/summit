import { QueueManager } from './core/QueueManager.js';
import { QueueManagerAPI } from './api/server.js';
import { Logger } from './utils/logger.js';
import { JobPriority } from './types/index.js';

const logger = new Logger('Main');

// Example job processors
async function emailProcessor(job: any) {
  logger.info(`Processing email job ${job.id}`, job.data);
  // Simulate email sending
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { sent: true, timestamp: new Date() };
}

async function webhookProcessor(job: any) {
  logger.info(`Processing webhook job ${job.id}`, job.data);
  // Simulate webhook delivery
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { delivered: true, timestamp: new Date() };
}

async function dataProcessor(job: any) {
  logger.info(`Processing data job ${job.id}`, job.data);
  // Simulate data processing
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { processed: true, records: job.data.records || 0 };
}

async function aiInferenceProcessor(job: any) {
  logger.info(`Processing AI inference job ${job.id}`, job.data);
  // Simulate AI inference
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return { prediction: Math.random(), confidence: 0.95 };
}

async function main() {
  logger.info('Starting Queue Manager...');

  // Initialize queue manager
  const queueManager = new QueueManager();

  // Register queues with rate limits
  queueManager.registerQueue('email-notifications', {
    rateLimit: { max: 100, duration: 60000 },
  });
  queueManager.registerQueue('webhook-delivery', {
    rateLimit: { max: 50, duration: 60000 },
  });
  queueManager.registerQueue('data-processing');
  queueManager.registerQueue('ai-inference', {
    rateLimit: { max: 20, duration: 60000 },
  });

  // Register processors
  queueManager.registerProcessor('email-notifications', emailProcessor);
  queueManager.registerProcessor('webhook-delivery', webhookProcessor);
  queueManager.registerProcessor('data-processing', dataProcessor);
  queueManager.registerProcessor('ai-inference', aiInferenceProcessor);

  // Start workers
  await queueManager.startWorkers();

  // Start API server
  const api = new QueueManagerAPI(queueManager, 3010);
  api.start();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await queueManager.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await queueManager.shutdown();
    process.exit(0);
  });

  logger.info('Queue Manager is ready!');
  logger.info('Dashboard: http://localhost:3010');
  logger.info('API: http://localhost:3010/api');
  logger.info('Metrics: http://localhost:3010/metrics');
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

// Export for use as a library
export { QueueManager, QueueManagerAPI, JobPriority };
export * from './types/index.js';
