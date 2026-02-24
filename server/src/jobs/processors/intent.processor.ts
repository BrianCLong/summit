import { Job } from 'bullmq';
import { WriteIntent, IntentService } from '../../federation/intents.js';
import logger from '../../utils/logger.js';
import { withOpaPolicy, JobPolicyContext } from './opa-job-wrapper.js';

const intentProcessorImpl = async (job: Job<WriteIntent>, _policyContext?: JobPolicyContext) => {
  const intent = job.data;
  logger.info({ intentId: intent.id, jobId: job.id }, 'Processing federation intent');

  try {
    const service = IntentService.getInstance();
    await service.applyIntent(intent);
    logger.info({ intentId: intent.id }, 'Intent applied successfully');
  } catch (error: any) {
    logger.error({ intentId: intent.id, error: error.message }, 'Failed to apply intent');

    // Explicitly fail the job so BullMQ handles retries/dead-lettering
    // We append the error reason to the job status if possible (BullMQ supports return values or error throwing)
    throw new Error(`INTENT_FAILED: ${error.message}`);
  }
};

// Export OPA-wrapped processor for production use
export const intentProcessor = withOpaPolicy('intents', intentProcessorImpl);
