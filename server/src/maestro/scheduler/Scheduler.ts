import { runsRepo } from '../runs/runs-repo.js';
import { executorsRepo } from '../executors/executors-repo.js';
import pino from 'pino';
import { QueueHelper, PrioritizedItem } from './QueueHelper.js';
import { ExecutorSelector } from './ExecutorSelector.js';

const logger = (pino as any)({ name: 'maestro-scheduler' });
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_RECOVERY_LIMIT = 2000;

function parseNumericEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

interface QueueItem extends PrioritizedItem {
  runId: string;
  tenantId: string;
}

interface SchedulerDeps {
  queueHelper: QueueHelper<QueueItem>;
  executorSelector: ExecutorSelector;
  runsRepo: typeof runsRepo;
  executorsRepo: typeof executorsRepo;
  logger: typeof logger;
  pollIntervalMs: number;
  recoveryLimit: number;
  autoStart: boolean;
}

export class MaestroScheduler {
  private static _instance: MaestroScheduler;
  private isProcessing = false;
  private queueHelper: QueueHelper<QueueItem>;
  private executorSelector: ExecutorSelector;
  private runsRepo: typeof runsRepo;
  private executorsRepo: typeof executorsRepo;
  private logger: typeof logger;
  private pollIntervalMs: number;
  private recoveryLimit: number;
  private intervalId: NodeJS.Timeout | null = null;
  private enqueuedRuns = new Set<string>();

  private constructor(overrides: Partial<SchedulerDeps> = {}) {
    this.queueHelper =
      overrides.queueHelper ?? new QueueHelper<QueueItem>();
    this.executorSelector =
      overrides.executorSelector ?? new ExecutorSelector();
    this.runsRepo = overrides.runsRepo ?? runsRepo;
    this.executorsRepo = overrides.executorsRepo ?? executorsRepo;
    this.logger = overrides.logger ?? logger;
    this.pollIntervalMs =
      overrides.pollIntervalMs ??
      parseNumericEnv(
        process.env.MAESTRO_SCHEDULER_INTERVAL_MS,
        DEFAULT_POLL_INTERVAL_MS,
      );
    this.recoveryLimit =
      overrides.recoveryLimit ??
      parseNumericEnv(
        process.env.MAESTRO_SCHEDULER_RECOVERY_LIMIT,
        DEFAULT_RECOVERY_LIMIT,
      );

    if (overrides.autoStart !== false) {
      this.start();
    }
  }

  public static getInstance(): MaestroScheduler {
    if (!MaestroScheduler._instance) {
      MaestroScheduler._instance = new MaestroScheduler();
    }
    return MaestroScheduler._instance;
  }

  public static createForTesting(
    overrides: Partial<SchedulerDeps> = {},
  ): MaestroScheduler {
    return new MaestroScheduler({ ...overrides, autoStart: false });
  }

  public start() {
    if (!this.intervalId) {
      this.intervalId = setInterval(
        () => this.processQueue(),
        this.pollIntervalMs,
      );

      // Initial population from DB to handle restarts
      this.triggerRecovery();
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
      const pendingRuns = await this.runsRepo.listByStatus(
        ['queued'],
        this.recoveryLimit,
      );
      if (pendingRuns.length === 0) {
        return;
      }
      for (const run of pendingRuns) {
        await this.enqueueRun(run.id, run.tenant_id);
      }
      this.logger.info(
        { count: pendingRuns.length },
        'Recovered pending runs',
      );
    } catch (err: any) {
      this.logger.error({ err }, 'Failed to recover pending runs');
    }
  }

  public async triggerRecovery() {
    await this.recoverPendingRuns();
  }

  /**
   * Enqueues a run for execution.
   * @param runId The ID of the run.
   * @param tenantId The tenant ID.
   * @param priority Priority of the run (higher is better).
   */
  public async enqueueRun(runId: string, tenantId: string, priority = 0) {
    if (this.enqueuedRuns.has(runId)) {
      this.logger.debug({ runId, tenantId }, 'Run already queued');
      return;
    }
    this.logger.info({ runId, tenantId, priority }, 'Enqueueing run');
    this.queueHelper.enqueue({ runId, tenantId, priority });
    this.enqueuedRuns.add(runId);

    // Trigger processing immediately if idle
    if (!this.isProcessing) {
      void this.processQueue();
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
        const executors = await this.executorsRepo.list(item.tenantId);
        const candidateExecutor = this.executorSelector.selectExecutor(
          executors,
          item.tenantId,
        );

        if (candidateExecutor) {
          const updatedExecutor = await this.executorsRepo.update(
            candidateExecutor.id,
            { status: 'busy' },
            item.tenantId,
          );

          if (updatedExecutor && updatedExecutor.status === 'busy') {
            // Dequeue
            this.queueHelper.dequeue();
            this.enqueuedRuns.delete(item.runId);

            this.logger.info(
              { runId: item.runId, executorId: candidateExecutor.id },
              'Assigning run to executor',
            );

            // Update run status to 'running' and assign executor
            await this.runsRepo.update(
              item.runId,
              {
                status: 'running',
                executor_id: candidateExecutor.id,
                started_at: new Date(),
              },
              item.tenantId,
            );
          } else {
            // Failed to claim, break inner loop to retry finding executor
            this.logger.warn(
              { executorId: candidateExecutor.id },
              'Failed to claim executor, retrying...',
            );
            break;
          }
        } else {
          // No executors available, wait for next cycle
          this.logger.debug(
            { tenantId: item.tenantId },
            'No executors available, waiting...',
          );
          break;
        }
      }
    } catch (error: any) {
      this.logger.error({ error }, 'Error processing scheduler queue');
    } finally {
      this.isProcessing = false;
    }
  }

  // Expose queue status for monitoring
  public getQueueStatus() {
    return {
      size: this.queueHelper.size,
      processing: this.isProcessing,
    };
  }
}

export const scheduler = MaestroScheduler.getInstance();
