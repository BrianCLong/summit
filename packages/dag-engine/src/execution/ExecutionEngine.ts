/**
 * Execution Engine for running DAG workflows
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { DAG } from '../core/DAG.js';
import {
  TaskState,
  TaskExecution,
  WorkflowExecution,
  ExecutionContext,
  Operator,
  TaskConfig,
  TriggerRule,
} from '../core/types.js';

interface ExecutionEngineConfig {
  concurrency?: number;
  defaultTimeout?: number;
}

interface ExecutionEvents {
  'workflow:start': (execution: WorkflowExecution) => void;
  'workflow:complete': (execution: WorkflowExecution) => void;
  'workflow:failed': (execution: WorkflowExecution, error: Error) => void;
  'task:start': (execution: TaskExecution) => void;
  'task:complete': (execution: TaskExecution) => void;
  'task:failed': (execution: TaskExecution, error: Error) => void;
  'task:retry': (execution: TaskExecution, attempt: number) => void;
}

export class ExecutionEngine extends EventEmitter<ExecutionEvents> {
  private config: ExecutionEngineConfig;
  private queue: PQueue;
  private operators: Map<string, Operator>;
  private executions: Map<string, WorkflowExecution>;
  private taskExecutions: Map<string, Map<string, TaskExecution>>;
  private taskOutputs: Map<string, Map<string, any>>;

  constructor(config: ExecutionEngineConfig = {}) {
    super();
    this.config = {
      concurrency: config.concurrency || 10,
      defaultTimeout: config.defaultTimeout || 3600000, // 1 hour
    };
    this.queue = new PQueue({ concurrency: this.config.concurrency });
    this.operators = new Map();
    this.executions = new Map();
    this.taskExecutions = new Map();
    this.taskOutputs = new Map();
  }

  /**
   * Register an operator
   */
  registerOperator(name: string, operator: Operator): void {
    this.operators.set(name, operator);
  }

  /**
   * Execute a DAG
   */
  async execute(
    dag: DAG,
    params?: Record<string, any>
  ): Promise<WorkflowExecution> {
    // Validate DAG
    const validation = dag.validate();
    if (!validation.valid) {
      throw new Error(`DAG validation failed: ${validation.errors.join(', ')}`);
    }

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      executionId,
      dagId: dag.dagId,
      state: 'running',
      startTime: new Date(),
      executionDate: new Date(),
      params: params || {},
      context: {},
    };

    this.executions.set(executionId, execution);
    this.taskExecutions.set(executionId, new Map());
    this.taskOutputs.set(executionId, new Map());

    this.emit('workflow:start', execution);

    try {
      await this.executeDAG(dag, execution);
      execution.state = 'success';
      execution.endTime = new Date();
      this.emit('workflow:complete', execution);
    } catch (error) {
      execution.state = 'failed';
      execution.endTime = new Date();
      this.emit('workflow:failed', execution, error as Error);
      throw error;
    }

    return execution;
  }

  /**
   * Execute DAG tasks in topological order with parallel execution where possible
   */
  private async executeDAG(
    dag: DAG,
    workflowExecution: WorkflowExecution
  ): Promise<void> {
    const taskStates = new Map<string, TaskState>();
    const tasks = dag.getTasks();

    // Initialize all tasks to pending
    tasks.forEach(task => taskStates.set(task.taskId, 'pending'));

    // Get tasks in layers for parallel execution
    const layers = this.getExecutionLayers(dag);

    for (const layer of layers) {
      // Execute all tasks in this layer in parallel
      await Promise.all(
        layer.map(taskId => {
          const task = dag.getTask(taskId);
          if (!task) return Promise.resolve();

          return this.queue.add(async () => {
            const shouldRun = this.shouldRunTask(dag, taskId, taskStates);

            if (!shouldRun) {
              taskStates.set(taskId, 'skipped');
              return;
            }

            taskStates.set(taskId, 'queued');
            await this.executeTask(dag, task, workflowExecution, taskStates);
          });
        })
      );
    }

    // Check if any tasks failed
    const failedTasks = Array.from(taskStates.entries())
      .filter(([_, state]) => state === 'failed')
      .map(([taskId]) => taskId);

    if (failedTasks.length > 0) {
      throw new Error(`Tasks failed: ${failedTasks.join(', ')}`);
    }
  }

  /**
   * Get execution layers for parallel execution
   */
  private getExecutionLayers(dag: DAG): string[][] {
    const layers: string[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // Calculate in-degree for each task
    const tasks = dag.getTasks();
    tasks.forEach(task => {
      const upstream = dag.getUpstreamTasks(task.taskId);
      inDegree.set(task.taskId, upstream.length);
    });

    while (visited.size < tasks.length) {
      const layer: string[] = [];

      // Find all tasks with in-degree 0
      tasks.forEach(task => {
        if (!visited.has(task.taskId) && inDegree.get(task.taskId) === 0) {
          layer.push(task.taskId);
        }
      });

      if (layer.length === 0) break;

      // Mark as visited and update downstream tasks
      layer.forEach(taskId => {
        visited.add(taskId);
        const downstream = dag.getDownstreamTasks(taskId);
        downstream.forEach(downstreamId => {
          const current = inDegree.get(downstreamId) || 0;
          inDegree.set(downstreamId, current - 1);
        });
      });

      layers.push(layer);
    }

    return layers;
  }

  /**
   * Check if task should run based on trigger rules
   */
  private shouldRunTask(
    dag: DAG,
    taskId: string,
    taskStates: Map<string, TaskState>
  ): boolean {
    const task = dag.getTask(taskId);
    if (!task) return false;

    const upstreamTasks = dag.getUpstreamTasks(taskId);
    if (upstreamTasks.length === 0) return true;

    const upstreamStates = upstreamTasks.map(id => taskStates.get(id)!);
    const triggerRule = task.triggerRule || 'all_success';

    switch (triggerRule) {
      case 'all_success':
        return upstreamStates.every(state => state === 'success');

      case 'all_failed':
        return upstreamStates.every(state => state === 'failed');

      case 'all_done':
        return upstreamStates.every(state =>
          ['success', 'failed', 'skipped'].includes(state)
        );

      case 'one_success':
        return upstreamStates.some(state => state === 'success');

      case 'one_failed':
        return upstreamStates.some(state => state === 'failed');

      case 'none_failed':
        return !upstreamStates.some(state => state === 'failed');

      case 'none_skipped':
        return !upstreamStates.some(state => state === 'skipped');

      case 'always':
        return true;

      default:
        return upstreamStates.every(state => state === 'success');
    }
  }

  /**
   * Execute a single task with retry logic
   */
  private async executeTask(
    dag: DAG,
    task: TaskConfig,
    workflowExecution: WorkflowExecution,
    taskStates: Map<string, TaskState>
  ): Promise<void> {
    const operator = this.operators.get(task.operator);
    if (!operator) {
      throw new Error(`Operator ${task.operator} not found for task ${task.taskId}`);
    }

    const maxAttempts = (task.retryPolicy?.maxRetries || 0) + 1;
    let attempt = 0;
    let lastError: Error | undefined;

    const taskExecution: TaskExecution = {
      executionId: uuidv4(),
      taskId: task.taskId,
      dagId: dag.dagId,
      workflowExecutionId: workflowExecution.executionId,
      state: 'running',
      attempt: 0,
      maxAttempts,
      logs: [],
    };

    this.taskExecutions.get(workflowExecution.executionId)!.set(task.taskId, taskExecution);

    while (attempt < maxAttempts) {
      attempt++;
      taskExecution.attempt = attempt;
      taskExecution.startTime = new Date();
      taskStates.set(task.taskId, 'running');

      if (attempt === 1) {
        this.emit('task:start', taskExecution);
      } else {
        taskExecution.state = 'retrying';
        this.emit('task:retry', taskExecution, attempt);
      }

      const context = this.createExecutionContext(
        workflowExecution,
        task.taskId,
        attempt
      );

      try {
        // Execute with timeout
        const timeout = task.timeout?.execution || this.config.defaultTimeout;
        const result = await this.executeWithTimeout(
          operator.execute(context),
          timeout!
        );

        taskExecution.output = result;
        taskExecution.state = 'success';
        taskExecution.endTime = new Date();
        taskExecution.duration = taskExecution.endTime.getTime() - taskExecution.startTime.getTime();
        taskStates.set(task.taskId, 'success');

        // Store output
        this.taskOutputs.get(workflowExecution.executionId)!.set(task.taskId, result);

        // Call onSuccess callback
        if (operator.onSuccess) {
          await operator.onSuccess(context, result);
        }

        this.emit('task:complete', taskExecution);
        return;

      } catch (error) {
        lastError = error as Error;
        taskExecution.error = lastError.message;
        taskExecution.endTime = new Date();
        taskExecution.duration = taskExecution.endTime.getTime() - taskExecution.startTime.getTime();

        // Call onRetry callback
        if (attempt < maxAttempts && operator.onRetry) {
          await operator.onRetry(context, lastError, attempt);
        }

        // Wait before retry with exponential backoff
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(task, attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    taskExecution.state = 'failed';
    taskStates.set(task.taskId, 'failed');

    // Call onFailure callback
    const context = this.createExecutionContext(
      workflowExecution,
      task.taskId,
      attempt
    );
    if (operator.onFailure && lastError) {
      await operator.onFailure(context, lastError);
    }

    this.emit('task:failed', taskExecution, lastError!);
    throw lastError;
  }

  /**
   * Create execution context for a task
   */
  private createExecutionContext(
    workflowExecution: WorkflowExecution,
    taskId: string,
    attempt: number
  ): ExecutionContext {
    const variables = new Map<string, any>();

    return {
      executionId: workflowExecution.executionId,
      dagId: workflowExecution.dagId,
      executionDate: workflowExecution.executionDate,
      params: workflowExecution.params || {},
      taskId,
      attempt,
      variables: {},
      getTaskOutput: async (taskId: string) => {
        return this.taskOutputs.get(workflowExecution.executionId)?.get(taskId);
      },
      setVariable: (key: string, value: any) => {
        variables.set(key, value);
      },
      getVariable: (key: string) => {
        return variables.get(key);
      },
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(task: TaskConfig, attempt: number): number {
    const baseDelay = task.retryPolicy?.retryDelay || 60000;
    const exponentialBackoff = task.retryPolicy?.exponentialBackoff !== false;
    const multiplier = task.retryPolicy?.backoffMultiplier || 2;
    const maxDelay = task.retryPolicy?.maxRetryDelay || 600000;

    if (!exponentialBackoff) {
      return baseDelay;
    }

    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get workflow execution
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get task execution
   */
  getTaskExecution(executionId: string, taskId: string): TaskExecution | undefined {
    return this.taskExecutions.get(executionId)?.get(taskId);
  }

  /**
   * Get all task executions for a workflow
   */
  getTaskExecutions(executionId: string): TaskExecution[] {
    const executions = this.taskExecutions.get(executionId);
    return executions ? Array.from(executions.values()) : [];
  }
}
