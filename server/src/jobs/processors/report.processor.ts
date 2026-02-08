import { Job } from 'bullmq';
import logger from '../../utils/logger.js';
import { withOpaPolicy, JobPolicyContext } from './opa-job-wrapper.js';

const reportProcessorImpl = async (job: Job, _policyContext?: JobPolicyContext) => {
  logger.info(`Generating report for job ${job.id}`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  logger.info(`Report generated for job ${job.id}`);
  return { reportUrl: `https://example.com/reports/${job.id}.pdf` };
};

// Export OPA-wrapped processor for production use
export const reportProcessor = withOpaPolicy('reports', reportProcessorImpl);
