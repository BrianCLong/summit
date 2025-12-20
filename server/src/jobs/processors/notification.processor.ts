import { Job } from 'bullmq';
import logger from '../../utils/logger.js';

export const notificationProcessor = async (job: Job) => {
  logger.info(`Sending notification for job ${job.id} to ${job.data.to}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  logger.info(`Notification sent for job ${job.id}`);
  return { sent: true };
};
