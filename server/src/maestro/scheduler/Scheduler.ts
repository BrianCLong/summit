import { runsRepo } from '../runs/runs-repo.js';
import { executorsRepo } from '../executors/executors-repo.js';
import pino from 'pino';
import { QueueHelper, PrioritizedItem } from './QueueHelper.js';
import { ExecutorSelector } from './ExecutorSelector.js';

const logger = (pino as any)({ name: 'maestro-scheduler' });

interface QueueItem extends PrioritizedItem {
  runId: string;
  tenantId: string;
}

export class MaestroScheduler {
  private static _instance: MaestroScheduler;
  private isProcessing = false;
  private queueHelper: QueueHelper<QueueItem>;
  private executorSelector: ExecutorSelector;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.queueHelper = new QueueHelper<QueueItem>();
    this.executorSelector = new ExecutorSelector();
    this.start();
  }

  public static getInstance(): MaestroScheduler {
    if (!MaestroScheduler._instance) {
      MaestroScheduler._instance = new MaestroScheduler();
    }
    return MaestroScheduler._instance;
  }

  public start() {
      if (!this.intervalId) {
          // Poll every 5 seconds
          this.intervalId = setInterval(() => this.processQueue(), 5000);

          // Initial population from DB to handle restarts
          this.recoverPendingRuns();
      }
  }

  public stop() {
      if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
      }
  }

  // Recover any runs that are in 'queued' state from the DB
  private async recoverPendingRuns() {
      try {
          // Placeholder for DB recovery logic
          // In a real implementation, we would query runsRepo for status='queued'
          // and re-enqueue them.
      } catch (err: any) {
          logger.error({ err }, 'Failed to recover pending runs');
      }
  }

  /**
   * Enqueues a run for execution.
   * @param runId The ID of the run.
   * @param tenantId The tenant ID.
   * @param priority Priority of the run (higher is better).
   */
  public async enqueueRun(runId: string, tenantId: string, priority = 0) {
    logger.info({ runId, tenantId, priority }, 'Enqueueing run');
    this.queueHelper.enqueue({ runId, tenantId, priority });

    // Trigger processing immediately if idle
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Processes the queue, assigning runs to executors.
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (!this.queueHelper.isEmpty()) {
        const item = this.queueHelper.peek();
        if (!item) break;

        // Find any 'ready' executor for the tenant
        const executors = await executorsRepo.list(item.tenantId);
        const candidateExecutor = this.executorSelector.selectExecutor(executors, item.tenantId);

        if (candidateExecutor) {
            const updatedExecutor = await executorsRepo.update(candidateExecutor.id, { status: 'busy' }, item.tenantId);

            if (updatedExecutor && updatedExecutor.status === 'busy') {
                // Dequeue
                this.queueHelper.dequeue();

                logger.info({ runId: item.runId, executorId: candidateExecutor.id }, 'Assigning run to executor');

                // Update run status to 'running' and assign executor
                await runsRepo.update(item.runId, {
                    status: 'running',
                    executor_id: candidateExecutor.id,
                    started_at: new Date()
                }, item.tenantId);
            } else {
                 // Failed to claim, break inner loop to retry finding executor
                 logger.warn({ executorId: candidateExecutor.id }, 'Failed to claim executor, retrying...');
                 break;
            }

        } else {
            // No executors available, wait for next cycle
            logger.debug({ tenantId: item.tenantId }, 'No executors available, waiting...');
            break;
        }
      }
    } catch (error: any) {
      logger.error({ error }, 'Error processing scheduler queue');
    } finally {
      this.isProcessing = false;
    }
  }

  // Expose queue status for monitoring
  public getQueueStatus() {
      return {
          size: this.queueHelper.size,
          processing: this.isProcessing
      };
  }
}

export const scheduler = MaestroScheduler.getInstance();
