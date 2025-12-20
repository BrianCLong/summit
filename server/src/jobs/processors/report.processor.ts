import { Job } from 'bullmq';
import logger from '../../utils/logger.js';

export const reportProcessor = async (job: Job) => {
  logger.info(`Generating report for job ${job.id}`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  logger.info(`Report generated for job ${job.id}`);
  return { reportUrl: `https://example.com/reports/${job.id}.pdf` };
};
