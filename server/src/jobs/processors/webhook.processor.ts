import { Job } from 'bullmq';
import logger from '../../utils/logger.js';
import { withOpaPolicy, JobPolicyContext } from './opa-job-wrapper.js';

const webhookProcessorImpl = async (job: Job, _policyContext?: JobPolicyContext) => {
  logger.info(`Processing webhook ${job.id}`);
  // Logic to handle webhook
  logger.info(`Webhook payload:`, job.data);
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { status: 'processed' };
};

// Export OPA-wrapped processor for production use
export const webhookProcessor = withOpaPolicy('webhooks', webhookProcessorImpl);
