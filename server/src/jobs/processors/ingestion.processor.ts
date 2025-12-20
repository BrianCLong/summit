import { Job } from 'bullmq';
import logger from '../../utils/logger.js';

export const ingestionProcessor = async (job: Job) => {
  logger.info(`Starting ingestion job ${job.id}`);
  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (Math.random() < 0.1) {
      throw new Error("Random ingestion failure");
  }

  logger.info(`Ingestion job ${job.id} completed`, job.data);
  return { processed: true, count: 100 };
};
