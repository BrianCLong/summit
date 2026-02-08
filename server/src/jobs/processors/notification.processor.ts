import { Job } from 'bullmq';
import logger from '../../utils/logger.js';
import { withOpaPolicy, JobPolicyContext } from './opa-job-wrapper.js';

const notificationProcessorImpl = async (job: Job, _policyContext?: JobPolicyContext) => {
  logger.info(`Sending notification for job ${job.id} to ${job.data.to}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  logger.info(`Notification sent for job ${job.id}`);
  return { sent: true };
};

// Export OPA-wrapped processor for production use
export const notificationProcessor = withOpaPolicy('notifications', notificationProcessorImpl);
