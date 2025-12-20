import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import os from 'os';
import { Logger } from '../utils/logger.js';
import { JobProcessor } from '../core/QueueManager.js';

export interface WorkerScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number; // Queue size threshold to scale up
  scaleDownThreshold: number; // Queue size threshold to scale down
  cpuThreshold: number; // CPU usage threshold (0-1)
  memoryThreshold: number; // Memory usage threshold (0-1)
}

/**
 * Manages horizontal scaling of workers based on queue load and system resources
 */
export class WorkerManager {
  private workers: Map<string, Worker[]> = new Map();
  private logger: Logger;
  private connection: IORedis;
  private scalingConfig: WorkerScalingConfig;
  private scalingInterval?: NodeJS.Timeout;

  constructor(
    connection: IORedis,
    config: Partial<WorkerScalingConfig> = {},
  ) {
    this.connection = connection;
    this.logger = new Logger('WorkerManager');
    this.scalingConfig = {
      minWorkers: config.minWorkers || 1,
      maxWorkers: config.maxWorkers || os.cpus().length,
      scaleUpThreshold: config.scaleUpThreshold || 100,
      scaleDownThreshold: config.scaleDownThreshold || 10,
      cpuThreshold: config.cpuThreshold || 0.8,
      memoryThreshold: config.memoryThreshold || 0.85,
    };
  }

  /**
   * Initialize worker pool for a queue
   */
  async initializeWorkerPool(
    queueName: string,
    processor: JobProcessor,
    initialWorkers: number = this.scalingConfig.minWorkers,
  ): Promise<void> {
    const workers: Worker[] = [];

    for (let i = 0; i < initialWorkers; i++) {
      const worker = await this.createWorker(queueName, processor, i);
      workers.push(worker);
    }

    this.workers.set(queueName, workers);
    this.logger.info(
      `Initialized ${initialWorkers} workers for queue ${queueName}`,
    );
  }

  /**
   * Start auto-scaling based on queue metrics and system resources
   */
  startAutoScaling(checkInterval: number = 30000): void {
    this.scalingInterval = setInterval(() => {
      this.checkAndScale();
    }, checkInterval);

    this.logger.info(
      `Auto-scaling started with ${checkInterval}ms check interval`,
    );
  }

  /**
   * Stop auto-scaling
   */
  stopAutoScaling(): void {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = undefined;
      this.logger.info('Auto-scaling stopped');
    }
  }

  /**
   * Manually scale workers for a queue
   */
  async scaleWorkers(
    queueName: string,
    targetCount: number,
    processor: JobProcessor,
  ): Promise<void> {
    const currentWorkers = this.workers.get(queueName) || [];
    const currentCount = currentWorkers.length;

    if (targetCount === currentCount) {
      return;
    }

    if (targetCount > currentCount) {
      // Scale up
      const workersToAdd = targetCount - currentCount;
      for (let i = 0; i < workersToAdd; i++) {
        const worker = await this.createWorker(
          queueName,
          processor,
          currentCount + i,
        );
        currentWorkers.push(worker);
      }
      this.logger.info(
        `Scaled up ${queueName}: ${currentCount} -> ${targetCount}`,
      );
    } else {
      // Scale down
      const workersToRemove = currentCount - targetCount;
      for (let i = 0; i < workersToRemove; i++) {
        const worker = currentWorkers.pop();
        if (worker) {
          await worker.close();
        }
      }
      this.logger.info(
        `Scaled down ${queueName}: ${currentCount} -> ${targetCount}`,
      );
    }

    this.workers.set(queueName, currentWorkers);
  }

  /**
   * Get worker count for a queue
   */
  getWorkerCount(queueName: string): number {
    return this.workers.get(queueName)?.length || 0;
  }

  /**
   * Get system resource usage
   */
  getSystemResources(): {
    cpuUsage: number;
    memoryUsage: number;
    availableMemory: number;
    totalMemory: number;
  } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpuUsage: os.loadavg()[0] / os.cpus().length, // 1-minute load average normalized
      memoryUsage: usedMemory / totalMemory,
      availableMemory: freeMemory,
      totalMemory,
    };
  }

  /**
   * Gracefully shutdown all workers
   */
  async shutdown(): Promise<void> {
    this.stopAutoScaling();

    const closePromises: Promise<void>[] = [];
    for (const [queueName, workers] of this.workers.entries()) {
      this.logger.info(`Closing ${workers.length} workers for ${queueName}`);
      for (const worker of workers) {
        closePromises.push(worker.close());
      }
    }

    await Promise.all(closePromises);
    this.workers.clear();
    this.logger.info('All workers closed');
  }

  // Private methods

  private async createWorker(
    queueName: string,
    processor: JobProcessor,
    index: number,
  ): Promise<Worker> {
    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency: 10,
      lockDuration: 30000,
    });

    worker.on('error', (error) => {
      this.logger.error(`Worker ${index} error in ${queueName}`, error);
    });

    worker.on('failed', (job, error) => {
      this.logger.error(
        `Worker ${index} job ${job?.id} failed in ${queueName}`,
        error,
      );
    });

    this.logger.info(`Created worker ${index} for queue ${queueName}`);
    return worker;
  }

  private async checkAndScale(): Promise<void> {
    const resources = this.getSystemResources();

    // Don't scale up if system resources are constrained
    const systemConstrained =
      resources.cpuUsage > this.scalingConfig.cpuThreshold ||
      resources.memoryUsage > this.scalingConfig.memoryThreshold;

    for (const [queueName, workers] of this.workers.entries()) {
      const currentCount = workers.length;

      // Get queue size (this would need to be implemented with actual queue metrics)
      const queueSize = await this.getQueueSize(queueName);

      // Determine scaling action
      if (
        queueSize > this.scalingConfig.scaleUpThreshold &&
        currentCount < this.scalingConfig.maxWorkers &&
        !systemConstrained
      ) {
        // Scale up
        const newCount = Math.min(
          currentCount + 1,
          this.scalingConfig.maxWorkers,
        );
        this.logger.info(
          `Auto-scaling up ${queueName}: ${currentCount} -> ${newCount} (queue size: ${queueSize})`,
        );
        // Note: Would need processor reference to actually scale
        // await this.scaleWorkers(queueName, newCount, processor);
      } else if (
        queueSize < this.scalingConfig.scaleDownThreshold &&
        currentCount > this.scalingConfig.minWorkers
      ) {
        // Scale down
        const newCount = Math.max(
          currentCount - 1,
          this.scalingConfig.minWorkers,
        );
        this.logger.info(
          `Auto-scaling down ${queueName}: ${currentCount} -> ${newCount} (queue size: ${queueSize})`,
        );
        // Note: Would need processor reference to actually scale
        // await this.scaleWorkers(queueName, newCount, processor);
      }
    }

    this.logger.debug('Auto-scaling check complete', {
      cpuUsage: `${(resources.cpuUsage * 100).toFixed(2)}%`,
      memoryUsage: `${(resources.memoryUsage * 100).toFixed(2)}%`,
      systemConstrained,
    });
  }

  private async getQueueSize(queueName: string): Promise<number> {
    // This is a placeholder - in practice, you'd query the actual queue
    // For now, return a random value for demonstration
    return Math.floor(Math.random() * 200);
  }
}
