// Queue Worker for Processing Scheduled Tasks
// Implements worker processes that consume tasks from Redis queues

import { costAwareScheduler, SchedulingContext } from './cost-aware-scheduler';
import { ExpertArm } from '../learn/bandit';
import { prometheusConductorMetrics } from '../observability/prometheus';
import { adaptiveRouter } from '../router/router-v2';
import { performance } from 'perf_hooks';

export interface WorkerConfig {
  workerId: string;
  expertType: ExpertArm | 'light';
  queueNames: string[];
  concurrency: number;
  pollInterval: number;
  maxRetries: number;
  shutdownTimeout: number;
}

export interface TaskResult {
  success: boolean;
  result?: any;
  error?: string;
  actualCost: number;
  processingTime: number;
  metadata?: any;
}

/**
 * Queue Worker Implementation
 */
export class QueueWorker {
  private config: WorkerConfig;
  private isRunning: boolean = false;
  private workerPromises: Promise<void>[] = [];
  private shutdownSignal: AbortController = new AbortController();

  constructor(config: WorkerConfig) {
    this.config = config;
    console.log(
      `Initializing queue worker ${config.workerId} for ${config.expertType}`,
    );
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn(`Worker ${this.config.workerId} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(
      `Starting worker ${this.config.workerId} with ${this.config.concurrency} concurrent processes`,
    );

    // Start concurrent worker processes
    for (let i = 0; i < this.config.concurrency; i++) {
      const workerPromise = this.workerLoop(`${this.config.workerId}-${i}`);
      this.workerPromises.push(workerPromise);
    }

    // Handle shutdown signals
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    // Record worker start
    prometheusConductorMetrics.recordOperationalEvent('worker_started', true);
  }

  /**
   * Main worker loop
   */
  private async workerLoop(workerId: string): Promise<void> {
    console.log(`Worker loop ${workerId} started`);

    while (this.isRunning && !this.shutdownSignal.signal.aborted) {
      try {
        // Try each queue in priority order
        let taskProcessed = false;

        for (const queueName of this.config.queueNames) {
          if (!this.isRunning) break;

          const task = await costAwareScheduler.getNextTask(queueName);

          if (task) {
            await this.processTask(workerId, queueName, task);
            taskProcessed = true;
            break;
          }
        }

        // If no tasks were processed, wait before polling again
        if (!taskProcessed) {
          await this.sleep(this.config.pollInterval);
        }
      } catch (error) {
        console.error(`Worker loop error in ${workerId}:`, error);
        prometheusConductorMetrics.recordOperationalEvent(
          'worker_error',
          false,
        );

        // Short delay before retrying on error
        await this.sleep(5000);
      }
    }

    console.log(`Worker loop ${workerId} stopped`);
  }

  /**
   * Process a single task
   */
  private async processTask(
    workerId: string,
    queueName: string,
    task: SchedulingContext,
  ): Promise<void> {
    const startTime = performance.now();
    console.log(
      `Worker ${workerId} processing task ${task.requestId} from ${queueName}`,
    );

    try {
      // Execute the task based on expert type
      const result = await this.executeTask(task);

      if (result.success) {
        // Mark task as completed
        await costAwareScheduler.completeTask(
          queueName,
          task.requestId,
          result.actualCost,
          result.processingTime,
          task.tenantId,
        );

        console.log(
          `Task ${task.requestId} completed successfully in ${result.processingTime}ms (cost: $${result.actualCost.toFixed(4)})`,
        );

        prometheusConductorMetrics.recordOperationalEvent(
          'worker_task_completed',
          true,
        );
        prometheusConductorMetrics.recordOperationalMetric(
          'worker_task_success_rate',
          1,
        );
      } else {
        // Mark task as failed
        await costAwareScheduler.failTask(
          queueName,
          task.requestId,
          result.error || 'Unknown error',
        );

        console.error(`Task ${task.requestId} failed:`, result.error);
        prometheusConductorMetrics.recordOperationalEvent(
          'worker_task_failed',
          false,
        );
        prometheusConductorMetrics.recordOperationalMetric(
          'worker_task_success_rate',
          0,
        );
      }
    } catch (error) {
      // Mark task as failed
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await costAwareScheduler.failTask(
        queueName,
        task.requestId,
        errorMessage,
      );

      console.error(`Task ${task.requestId} processing error:`, error);
      prometheusConductorMetrics.recordOperationalEvent(
        'worker_task_error',
        false,
      );
    }

    const totalProcessingTime = performance.now() - startTime;
    prometheusConductorMetrics.recordOperationalMetric(
      'worker_total_processing_time',
      totalProcessingTime,
    );
  }

  /**
   * Execute task based on expert type
   */
  private async executeTask(task: SchedulingContext): Promise<TaskResult> {
    const startTime = performance.now();

    try {
      // Create a mock execution context for the task
      const executionContext = {
        requestId: task.requestId,
        tenantId: task.tenantId,
        expertType: task.expertType,
        timeout: task.timeout,
        metadata: task.metadata,
      };

      // Route through the adaptive router for actual expert execution
      let result: any;
      let actualCost: number;

      // Simulate different expert processing based on type
      switch (task.expertType) {
        case 'graph_ops':
          result = await this.executeGraphOpsTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.9, 1.3); // Graph ops can vary widely
          break;

        case 'rag_retrieval':
          result = await this.executeRagRetrievalTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.8, 1.1); // Usually close to estimate
          break;

        case 'osint_analysis':
          result = await this.executeOsintAnalysisTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.7, 1.5); // Can vary significantly
          break;

        case 'export_generation':
          result = await this.executeExportGenerationTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.9, 1.1); // Predictable cost
          break;

        case 'file_management':
          result = await this.executeFileManagementTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.8, 1.0); // Usually less than estimated
          break;

        case 'general_llm':
          result = await this.executeGeneralLlmTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.85, 1.15); // Fairly predictable
          break;

        case 'code_generation':
          result = await this.executeCodeGenerationTask(executionContext);
          actualCost = this.calculateActualCost(task.estimatedCost, 0.8, 1.2); // Moderate variation
          break;

        default:
          throw new Error(`Unknown expert type: ${task.expertType}`);
      }

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        result,
        actualCost,
        processingTime,
        metadata: {
          workerId: `${this.config.workerId}-${process.pid}`,
          executionTime: processingTime,
        },
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown execution error',
        actualCost: 0,
        processingTime,
      };
    }
  }

  // Mock task execution methods (replace with actual implementations)
  private async executeGraphOpsTask(context: any): Promise<any> {
    // Simulate graph operations processing
    await this.sleep(Math.random() * 30000 + 15000); // 15-45 seconds
    return {
      status: 'completed',
      nodes: 150,
      edges: 320,
      insights: ['pattern1', 'anomaly2'],
    };
  }

  private async executeRagRetrievalTask(context: any): Promise<any> {
    await this.sleep(Math.random() * 20000 + 10000); // 10-30 seconds
    return {
      status: 'completed',
      documents: 25,
      chunks: 180,
      relevanceScore: 0.87,
    };
  }

  private async executeOsintAnalysisTask(context: any): Promise<any> {
    await this.sleep(Math.random() * 40000 + 20000); // 20-60 seconds
    return {
      status: 'completed',
      sources: 12,
      indicators: 8,
      confidence: 0.92,
    };
  }

  private async executeExportGenerationTask(context: any): Promise<any> {
    await this.sleep(Math.random() * 10000 + 5000); // 5-15 seconds
    return { status: 'completed', format: 'PDF', pages: 15, fileSize: '2.4MB' };
  }

  private async executeFileManagementTask(context: any): Promise<any> {
    await this.sleep(Math.random() * 5000 + 2000); // 2-7 seconds
    return { status: 'completed', operation: 'organize', filesProcessed: 45 };
  }

  private async executeGeneralLlmTask(context: any): Promise<any> {
    await this.sleep(Math.random() * 8000 + 2000); // 2-10 seconds
    return { status: 'completed', tokens: 1250, model: 'gpt-4' };
  }

  private async executeCodeGenerationTask(context: any): Promise<any> {
    await this.sleep(Math.random() * 15000 + 5000); // 5-20 seconds
    return {
      status: 'completed',
      linesOfCode: 120,
      language: 'typescript',
      tests: 8,
    };
  }

  /**
   * Calculate actual cost with variance
   */
  private calculateActualCost(
    estimatedCost: number,
    minMultiplier: number,
    maxMultiplier: number,
  ): number {
    const multiplier =
      Math.random() * (maxMultiplier - minMultiplier) + minMultiplier;
    return estimatedCost * multiplier;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log(`Shutting down worker ${this.config.workerId}...`);

    this.isRunning = false;
    this.shutdownSignal.abort();

    // Wait for worker processes to complete with timeout
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, this.config.shutdownTimeout);
    });

    try {
      await Promise.race([Promise.all(this.workerPromises), timeoutPromise]);
    } catch (error) {
      console.error('Error during worker shutdown:', error);
    }

    console.log(`Worker ${this.config.workerId} shutdown complete`);
    prometheusConductorMetrics.recordOperationalEvent('worker_shutdown', true);
  }

  /**
   * Get worker status
   */
  getStatus(): {
    workerId: string;
    expertType: ExpertArm | 'light';
    isRunning: boolean;
    concurrency: number;
    queueNames: string[];
  } {
    return {
      workerId: this.config.workerId,
      expertType: this.config.expertType,
      isRunning: this.isRunning,
      concurrency: this.config.concurrency,
      queueNames: this.config.queueNames,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Worker Factory - Creates workers based on environment configuration
 */
export class WorkerFactory {
  static createWorker(): QueueWorker {
    const expertType = (process.env.EXPERT_TYPE || 'light') as
      | ExpertArm
      | 'light';
    const queueNames = (process.env.QUEUE_NAMES || 'light_normal').split(',');

    const config: WorkerConfig = {
      workerId: process.env.WORKER_ID || `worker-${process.pid}`,
      expertType,
      queueNames,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
      pollInterval: parseInt(process.env.POLL_INTERVAL_MS || '1000'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '30000'),
    };

    return new QueueWorker(config);
  }

  /**
   * Create worker for specific expert type
   */
  static createExpertWorker(
    expertType: ExpertArm,
    priority: string[] = ['urgent', 'high', 'normal', 'low'],
  ): QueueWorker {
    const queueNames = priority.map((p) => `${expertType}_${p}`);

    const config: WorkerConfig = {
      workerId: `${expertType}-worker-${process.pid}`,
      expertType,
      queueNames,
      concurrency: expertType === 'general_llm' ? 4 : 2, // Light experts can handle more concurrency
      pollInterval: 1000,
      maxRetries: 3,
      shutdownTimeout: 30000,
    };

    return new QueueWorker(config);
  }

  /**
   * Create light worker pool
   */
  static createLightWorker(
    priorities: string[] = ['urgent', 'high', 'normal', 'low'],
  ): QueueWorker {
    const queueNames = priorities.map((p) => `light_${p}`);

    const config: WorkerConfig = {
      workerId: `light-worker-${process.pid}`,
      expertType: 'light',
      queueNames,
      concurrency: 3, // Light tasks can handle higher concurrency
      pollInterval: 500, // Poll more frequently for light tasks
      maxRetries: 3,
      shutdownTimeout: 15000,
    };

    return new QueueWorker(config);
  }
}

// Export singleton for container usage
export const queueWorker = WorkerFactory.createWorker();
