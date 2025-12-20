import { Job } from 'bullmq';
import logger from '../../utils/logger.js';

export const analyticsProcessor = async (job: Job) => {
  logger.info(`Running analytics for job ${job.id}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  logger.info(`Analytics run completed for job ${job.id}`);
  return { metrics: { cpu: 0.5, memory: 0.8 } };
};
