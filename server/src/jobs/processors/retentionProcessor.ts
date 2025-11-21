import { Job } from 'bullmq';
import { retentionEngine } from '../retention.js';
import { JobData } from '../../queue/types.js';
import pino from 'pino';

const logger = pino({ name: 'retention-processor' });

export async function retentionProcessor(job: Job<JobData>) {
  const { payload } = job.data;
  const { datasetId, mode } = payload;

  logger.info(`Starting retention purge for dataset ${datasetId} in ${mode} mode.`);

  try {
    await retentionEngine.purgeDataset(datasetId, mode || 'scheduled');
    logger.info(`Retention purge for dataset ${datasetId} completed.`);
    return { success: true, datasetId };
  } catch (error) {
    logger.error(`Retention purge failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
