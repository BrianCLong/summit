import { Job } from 'bullmq';
import logger from '../../utils/logger.js';

export const webhookProcessor = async (job: Job) => {
  logger.info(`Processing webhook ${job.id}`);
  // Logic to handle webhook
  logger.info(`Webhook payload:`, job.data);
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { status: 'processed' };
};
