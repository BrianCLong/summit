import { QueueJob, QueueProvider, EnqueueReceipt, JobStatus } from '../core/queue/provider';
import { featureFlags } from '../config/feature_flags';

export class VercelQueueAdapter implements QueueProvider {
  async enqueue(job: QueueJob): Promise<EnqueueReceipt> {
    if (!featureFlags.VERCEL_QUEUE_ENABLED) {
      throw new Error('Vercel Queues feature flag is OFF. Enqueue rejected.');
    }

    // Vercel Queues public API abstraction
    // In a real implementation this would call `import { enqueue } from '@vercel/functions'`
    return {
      jobId: job.id,
      status: 'enqueued',
      enqueuedAt: Date.now() // Note: In deterministic evidence we would avoid wall clocks
    };
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    if (!featureFlags.VERCEL_QUEUE_ENABLED) {
      throw new Error('Vercel Queues feature flag is OFF. Status check rejected.');
    }

    // Public API abstraction
    return {
      jobId,
      status: 'pending',
      attempts: 0
    };
  }
}
