/**
 * Codex Task Orchestrator
 *
 * Provides parallel task orchestration for AI/Codex workloads:
 * - Parallel task execution with configurable concurrency
 * - Dependency graph resolution for complex workflows
 * - Rate limiting to prevent API throttling
 * - Token budget management and cost tracking
 * - Graceful cancellation and timeout handling
 *
 * Trade-offs:
 * - Parallel execution increases resource usage (bounded by maxParallel)
 * - Dependency tracking adds memory overhead (minimal for typical workflows)
 * - Rate limiting may slow throughput (necessary for API compliance)
 */

import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { DistributedQueue } from '../distributed/DistributedQueue.js';
import {
  CodexTask,
  CodexTaskType,
  CodexTaskInput,
  CodexTaskConfig,
  CodexTaskStatus,
  CodexTaskResult,
  CodexBatch,
  BatchStrategy,
  BatchConfig,
  DistributedPriority,
} from '../distributed/types.js';
import { Logger } from '../utils/logger.js';

interface OrchestratorConfig {
  defaultMaxParallel: number;
  defaultTimeout: number;
  defaultRetries: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  tokenBudget: number;
  costPerToken: number;
}

interface TaskExecution {
  task: CodexTask;
  startTime: number;
  promise: Promise<CodexTaskResult>;
  abortController: AbortController;
}

interface DependencyNode {
  taskId: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
}

interface OrchestratorEvents {
  'task:queued': (task: CodexTask) => void;
  'task:started': (task: CodexTask) => void;
  'task:completed': (task: CodexTask, result: CodexTaskResult) => void;
  'task:failed': (task: CodexTask, error: Error) => void;
  'task:cancelled': (task: CodexTask) => void;
  'task:timeout': (task: CodexTask) => void;
  'batch:started': (batch: CodexBatch) => void;
  'batch:progress': (batch: CodexBatch, completedCount: number) => void;
  'batch:completed': (batch: CodexBatch) => void;
  'batch:failed': (batch: CodexBatch, failedTasks: CodexTask[]) => void;
  'rate-limit:hit': (waitTime: number) => void;
  'budget:warning': (usedTokens: number, budgetTokens: number) => void;
  'budget:exceeded': (usedTokens: number, budgetTokens: number) => void;
}

export class CodexTaskOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private distributedQueue: DistributedQueue;
  private activeExecutions: Map<string, TaskExecution> = new Map();
  private taskResults: Map<string, CodexTaskResult> = new Map();
  private batches: Map<string, CodexBatch> = new Map();
  private dependencyGraph: Map<string, DependencyNode> = new Map();
  private rateLimitTokens: number[] = [];
  private totalTokensUsed = 0;
  private logger: Logger;

  constructor(
    distributedQueue: DistributedQueue,
    config: Partial<OrchestratorConfig> = {},
  ) {
    super();
    this.distributedQueue = distributedQueue;
    this.logger = new Logger('CodexTaskOrchestrator');

    this.config = {
      defaultMaxParallel: config.defaultMaxParallel ?? 5,
      defaultTimeout: config.defaultTimeout ?? 60000, // 1 minute
      defaultRetries: config.defaultRetries ?? 2,
      rateLimitWindow: config.rateLimitWindow ?? 60000, // 1 minute
      rateLimitMax: config.rateLimitMax ?? 100,
      tokenBudget: config.tokenBudget ?? 1000000, // 1M tokens
      costPerToken: config.costPerToken ?? 0.00001, // $0.01 per 1K tokens
    };
  }

  /**
   * Submit a single task
   */
  async submitTask(
    type: CodexTaskType,
    input: CodexTaskInput,
    config: CodexTaskConfig = {},
  ): Promise<CodexTask> {
    const task: CodexTask = {
      id: uuid(),
      type,
      input,
      config: {
        model: config.model ?? 'gpt-4',
        maxTokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
        timeout: config.timeout ?? this.config.defaultTimeout,
        retries: config.retries ?? this.config.defaultRetries,
        parallel: config.parallel ?? true,
        dependsOn: config.dependsOn ?? [],
      },
      status: 'pending',
      createdAt: new Date(),
    };

    // Add to dependency graph
    this.addToDependencyGraph(task);

    // Queue the task
    await this.distributedQueue.addJob('codex-task', task, {
      priority: this.getTaskPriority(type),
      correlationId: task.id,
      metadata: {
        taskType: type,
        model: task.config.model,
      },
    });

    task.status = 'queued';
    this.emit('task:queued', task);
    this.logger.info('Task submitted', { taskId: task.id, type });

    return task;
  }

  /**
   * Submit a batch of tasks
   */
  async submitBatch(
    tasks: Array<{
      type: CodexTaskType;
      input: CodexTaskInput;
      config?: CodexTaskConfig;
    }>,
    batchConfig: BatchConfig = { strategy: 'parallel' },
  ): Promise<CodexBatch> {
    const batch: CodexBatch = {
      id: uuid(),
      tasks: [],
      strategy: batchConfig.strategy,
      status: 'pending',
      progress: 0,
    };

    // Create all tasks
    for (const taskDef of tasks) {
      const task: CodexTask = {
        id: uuid(),
        type: taskDef.type,
        input: taskDef.input,
        config: {
          model: taskDef.config?.model ?? 'gpt-4',
          maxTokens: taskDef.config?.maxTokens ?? 4096,
          temperature: taskDef.config?.temperature ?? 0.7,
          timeout: taskDef.config?.timeout ?? this.config.defaultTimeout,
          retries: taskDef.config?.retries ?? this.config.defaultRetries,
          parallel: taskDef.config?.parallel ?? batchConfig.strategy === 'parallel',
          dependsOn: taskDef.config?.dependsOn ?? [],
        },
        status: 'pending',
        createdAt: new Date(),
      };

      batch.tasks.push(task);
      this.addToDependencyGraph(task);
    }

    this.batches.set(batch.id, batch);

    // Execute batch based on strategy
    await this.executeBatch(batch, batchConfig);

    return batch;
  }

  /**
   * Execute a task directly (for use by workers)
   */
  async executeTask(task: CodexTask): Promise<CodexTaskResult> {
    // Check rate limit
    await this.waitForRateLimit();

    // Check dependencies
    if (task.config.dependsOn && task.config.dependsOn.length > 0) {
      await this.waitForDependencies(task);
    }

    // Check budget
    if (!this.checkBudget(task.config.maxTokens ?? 4096)) {
      throw new Error('Token budget exceeded');
    }

    const abortController = new AbortController();
    const timeout = task.config.timeout ?? this.config.defaultTimeout;

    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    const execution: TaskExecution = {
      task,
      startTime: Date.now(),
      promise: this.runTask(task, abortController.signal),
      abortController,
    };

    this.activeExecutions.set(task.id, execution);
    task.status = 'running';
    task.startedAt = new Date();
    this.updateDependencyStatus(task.id, 'running');

    this.emit('task:started', task);

    try {
      const result = await execution.promise;
      clearTimeout(timeoutId);

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      this.taskResults.set(task.id, result);
      this.updateDependencyStatus(task.id, 'completed');
      this.trackTokenUsage(result.tokens.input + result.tokens.output);

      this.emit('task:completed', task, result);
      this.logger.info('Task completed', {
        taskId: task.id,
        latency: result.latency,
        tokens: result.tokens,
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        task.status = 'timeout';
        this.emit('task:timeout', task);
      } else {
        task.status = 'failed';
        this.emit('task:failed', task, error instanceof Error ? error : new Error(String(error)));
      }

      this.updateDependencyStatus(task.id, 'failed');
      throw error;
    } finally {
      this.activeExecutions.delete(task.id);
    }
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const execution = this.activeExecutions.get(taskId);
    if (!execution) return false;

    execution.abortController.abort();
    execution.task.status = 'cancelled';

    this.emit('task:cancelled', execution.task);
    this.logger.info('Task cancelled', { taskId });

    return true;
  }

  /**
   * Cancel a batch
   */
  cancelBatch(batchId: string): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) return false;

    for (const task of batch.tasks) {
      if (task.status === 'running' || task.status === 'queued') {
        this.cancelTask(task.id);
      }
    }

    batch.status = 'failed';
    return true;
  }

  /**
   * Get task status
   */
  getTask(taskId: string): CodexTask | undefined {
    for (const batch of this.batches.values()) {
      const task = batch.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  /**
   * Get batch status
   */
  getBatch(batchId: string): CodexBatch | undefined {
    return this.batches.get(batchId);
  }

  /**
   * Get active tasks count
   */
  getActiveTasksCount(): number {
    return this.activeExecutions.size;
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(): {
    used: number;
    budget: number;
    remaining: number;
    estimatedCost: number;
  } {
    return {
      used: this.totalTokensUsed,
      budget: this.config.tokenBudget,
      remaining: Math.max(0, this.config.tokenBudget - this.totalTokensUsed),
      estimatedCost: this.totalTokensUsed * this.config.costPerToken,
    };
  }

  /**
   * Reset token usage counter
   */
  resetTokenUsage(): void {
    this.totalTokensUsed = 0;
    this.logger.info('Token usage reset');
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalBatches: number;
    tokenUsage: ReturnType<typeof this.getTokenUsage>;
    rateLimitRemaining: number;
  } {
    let completedTasks = 0;
    let failedTasks = 0;

    for (const batch of this.batches.values()) {
      for (const task of batch.tasks) {
        if (task.status === 'completed') completedTasks++;
        if (task.status === 'failed') failedTasks++;
      }
    }

    return {
      activeTasks: this.activeExecutions.size,
      completedTasks,
      failedTasks,
      totalBatches: this.batches.size,
      tokenUsage: this.getTokenUsage(),
      rateLimitRemaining: this.getRateLimitRemaining(),
    };
  }

  // Private methods

  private addToDependencyGraph(task: CodexTask): void {
    const node: DependencyNode = {
      taskId: task.id,
      dependencies: new Set(task.config.dependsOn ?? []),
      dependents: new Set(),
      status: 'pending',
    };

    this.dependencyGraph.set(task.id, node);

    // Update dependents for dependencies
    for (const depId of node.dependencies) {
      const depNode = this.dependencyGraph.get(depId);
      if (depNode) {
        depNode.dependents.add(task.id);
      }
    }

    // Check if ready to run
    if (node.dependencies.size === 0) {
      node.status = 'ready';
    }
  }

  private updateDependencyStatus(
    taskId: string,
    status: DependencyNode['status'],
  ): void {
    const node = this.dependencyGraph.get(taskId);
    if (!node) return;

    node.status = status;

    // If completed, check dependents
    if (status === 'completed') {
      for (const dependentId of node.dependents) {
        const dependent = this.dependencyGraph.get(dependentId);
        if (!dependent) continue;

        // Check if all dependencies are completed
        let allCompleted = true;
        for (const depId of dependent.dependencies) {
          const dep = this.dependencyGraph.get(depId);
          if (!dep || dep.status !== 'completed') {
            allCompleted = false;
            break;
          }
        }

        if (allCompleted) {
          dependent.status = 'ready';
        }
      }
    }
  }

  private async waitForDependencies(task: CodexTask): Promise<void> {
    const dependsOn = task.config.dependsOn ?? [];
    if (dependsOn.length === 0) return;

    const maxWait = task.config.timeout ?? this.config.defaultTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      let allCompleted = true;

      for (const depId of dependsOn) {
        const node = this.dependencyGraph.get(depId);
        if (!node || node.status !== 'completed') {
          allCompleted = false;
          break;
        }
      }

      if (allCompleted) return;

      await this.delay(100);
    }

    throw new Error('Dependency wait timeout');
  }

  private async executeBatch(batch: CodexBatch, config: BatchConfig): Promise<void> {
    batch.status = 'running';
    batch.startedAt = new Date();
    this.emit('batch:started', batch);

    try {
      switch (config.strategy) {
        case 'parallel':
          await this.executeParallel(batch, config.maxParallel ?? this.config.defaultMaxParallel);
          break;
        case 'sequential':
          await this.executeSequential(batch);
          break;
        case 'dependency-graph':
          await this.executeDependencyGraph(batch, config.maxParallel ?? this.config.defaultMaxParallel);
          break;
        case 'rate-limited':
          await this.executeRateLimited(
            batch,
            config.rateLimit ?? { max: this.config.rateLimitMax, window: this.config.rateLimitWindow },
          );
          break;
      }

      const failedTasks = batch.tasks.filter(t => t.status === 'failed');
      if (failedTasks.length > 0) {
        batch.status = config.continueOnError ? 'partial' : 'failed';
        this.emit('batch:failed', batch, failedTasks);
      } else {
        batch.status = 'completed';
        this.emit('batch:completed', batch);
      }
    } catch (error) {
      batch.status = 'failed';
      this.emit('batch:failed', batch, batch.tasks.filter(t => t.status !== 'completed'));
      throw error;
    } finally {
      batch.completedAt = new Date();
    }
  }

  private async executeParallel(batch: CodexBatch, maxParallel: number): Promise<void> {
    const queue = [...batch.tasks];
    const executing: Promise<void>[] = [];
    let completed = 0;

    while (queue.length > 0 || executing.length > 0) {
      // Fill up to maxParallel
      while (queue.length > 0 && executing.length < maxParallel) {
        const task = queue.shift()!;
        const promise = this.executeTask(task)
          .then(() => {
            completed++;
            batch.progress = Math.round((completed / batch.tasks.length) * 100);
            this.emit('batch:progress', batch, completed);
          })
          .catch(() => {
            completed++;
            batch.progress = Math.round((completed / batch.tasks.length) * 100);
          });

        executing.push(promise);
      }

      // Wait for any to complete
      if (executing.length > 0) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          const state = await Promise.race([
            executing[i].then(() => 'resolved').catch(() => 'rejected'),
            Promise.resolve('pending'),
          ]);
          if (state !== 'pending') {
            executing.splice(i, 1);
          }
        }
      }
    }
  }

  private async executeSequential(batch: CodexBatch): Promise<void> {
    for (let i = 0; i < batch.tasks.length; i++) {
      const task = batch.tasks[i];
      try {
        await this.executeTask(task);
      } catch (error) {
        // Continue to next task
      }
      batch.progress = Math.round(((i + 1) / batch.tasks.length) * 100);
      this.emit('batch:progress', batch, i + 1);
    }
  }

  private async executeDependencyGraph(batch: CodexBatch, maxParallel: number): Promise<void> {
    let completed = 0;

    while (completed < batch.tasks.length) {
      // Get ready tasks
      const readyTasks = batch.tasks.filter(t => {
        const node = this.dependencyGraph.get(t.id);
        return node && node.status === 'ready';
      });

      if (readyTasks.length === 0) {
        // Check for deadlock
        const pendingTasks = batch.tasks.filter(
          t => t.status === 'pending' || t.status === 'queued',
        );
        if (pendingTasks.length > 0 && completed < batch.tasks.length) {
          throw new Error('Dependency deadlock detected');
        }
        break;
      }

      // Execute ready tasks in parallel
      const tasksToRun = readyTasks.slice(0, maxParallel);

      await Promise.all(
        tasksToRun.map(async task => {
          try {
            await this.executeTask(task);
          } catch {
            // Task failed
          }
          completed++;
          batch.progress = Math.round((completed / batch.tasks.length) * 100);
          this.emit('batch:progress', batch, completed);
        }),
      );
    }
  }

  private async executeRateLimited(
    batch: CodexBatch,
    rateLimit: { max: number; window: number },
  ): Promise<void> {
    for (let i = 0; i < batch.tasks.length; i++) {
      await this.waitForRateLimit(rateLimit.max, rateLimit.window);

      const task = batch.tasks[i];
      try {
        await this.executeTask(task);
      } catch {
        // Continue to next task
      }

      batch.progress = Math.round(((i + 1) / batch.tasks.length) * 100);
      this.emit('batch:progress', batch, i + 1);
    }
  }

  private async runTask(task: CodexTask, signal: AbortSignal): Promise<CodexTaskResult> {
    // Simulate Codex API call - in production, this would call the actual API
    const startTime = Date.now();

    // Check for abort
    if (signal.aborted) {
      throw new Error('Task aborted');
    }

    // Simulate processing time based on task type
    const processingTime = this.estimateProcessingTime(task);
    await this.delay(Math.min(processingTime, 1000)); // Cap simulation at 1s

    // Check for abort again
    if (signal.aborted) {
      throw new Error('Task aborted');
    }

    // Generate result
    const result: CodexTaskResult = {
      output: `Generated output for ${task.type}: ${task.input.prompt.substring(0, 50)}...`,
      tokens: {
        input: Math.floor(task.input.prompt.length / 4),
        output: task.config.maxTokens ?? 1024,
      },
      latency: Date.now() - startTime,
      model: task.config.model ?? 'gpt-4',
    };

    return result;
  }

  private estimateProcessingTime(task: CodexTask): number {
    // Base time in ms
    const baseTimes: Record<CodexTaskType, number> = {
      'code-generation': 3000,
      'code-review': 2000,
      'refactoring': 2500,
      'testing': 2000,
      'documentation': 1500,
      'analysis': 2000,
      'custom': 2000,
    };

    return baseTimes[task.type] ?? 2000;
  }

  private getTaskPriority(type: CodexTaskType): DistributedPriority {
    const priorities: Record<CodexTaskType, DistributedPriority> = {
      'code-generation': DistributedPriority.NORMAL,
      'code-review': DistributedPriority.HIGH,
      'refactoring': DistributedPriority.NORMAL,
      'testing': DistributedPriority.HIGH,
      'documentation': DistributedPriority.LOW,
      'analysis': DistributedPriority.NORMAL,
      'custom': DistributedPriority.NORMAL,
    };

    return priorities[type] ?? DistributedPriority.NORMAL;
  }

  private async waitForRateLimit(
    max: number = this.config.rateLimitMax,
    window: number = this.config.rateLimitWindow,
  ): Promise<void> {
    const now = Date.now();

    // Remove old tokens
    this.rateLimitTokens = this.rateLimitTokens.filter(t => now - t < window);

    if (this.rateLimitTokens.length >= max) {
      const oldestToken = this.rateLimitTokens[0];
      const waitTime = window - (now - oldestToken);

      this.emit('rate-limit:hit', waitTime);
      this.logger.debug('Rate limit hit, waiting', { waitTime });

      await this.delay(waitTime);

      // Remove expired tokens after wait
      this.rateLimitTokens = this.rateLimitTokens.filter(t => Date.now() - t < window);
    }

    this.rateLimitTokens.push(now);
  }

  private getRateLimitRemaining(): number {
    const now = Date.now();
    const activeTokens = this.rateLimitTokens.filter(
      t => now - t < this.config.rateLimitWindow,
    );
    return Math.max(0, this.config.rateLimitMax - activeTokens.length);
  }

  private checkBudget(estimatedTokens: number): boolean {
    if (this.totalTokensUsed + estimatedTokens > this.config.tokenBudget) {
      this.emit('budget:exceeded', this.totalTokensUsed, this.config.tokenBudget);
      return false;
    }

    if (this.totalTokensUsed + estimatedTokens > this.config.tokenBudget * 0.8) {
      this.emit('budget:warning', this.totalTokensUsed, this.config.tokenBudget);
    }

    return true;
  }

  private trackTokenUsage(tokens: number): void {
    this.totalTokensUsed += tokens;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a Codex task orchestrator with default configuration
 */
export function createCodexTaskOrchestrator(
  distributedQueue: DistributedQueue,
  config?: Partial<OrchestratorConfig>,
): CodexTaskOrchestrator {
  return new CodexTaskOrchestrator(distributedQueue, config);
}
