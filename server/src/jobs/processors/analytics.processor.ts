import { Job } from 'bullmq';
import logger from '../../utils/logger.js';
import { withOpaPolicy, JobPolicyContext } from './opa-job-wrapper.js';

const analyticsProcessorImpl = async (job: Job, _policyContext?: JobPolicyContext) => {
  logger.info(`Running analytics for job ${job.id}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  logger.info(`Analytics run completed for job ${job.id}`);
  return { metrics: { cpu: 0.5, memory: 0.8 } };
};

// Export OPA-wrapped processor for production use
export const analyticsProcessor = withOpaPolicy('analytics', analyticsProcessorImpl);
