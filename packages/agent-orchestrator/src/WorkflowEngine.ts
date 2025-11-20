/**
 * Workflow DAG Execution Engine
 * Executes complex workflows as Directed Acyclic Graphs with dependency management
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  Task,
  TaskStatus,
  Workflow,
  WorkflowSchema,
  AgentPriority,
} from '@intelgraph/agent-framework';
import { TaskQueue } from './TaskQueue.js';
import { Scheduler } from './Scheduler.js';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  tasks: Map<string, Task>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  results: Map<string, any>;
}

export interface WorkflowEngineConfig {
  redisUrl: string;
  maxConcurrentWorkflows?: number;
}

export class WorkflowEngine extends EventEmitter {
  private taskQueue: TaskQueue;
  private scheduler: Scheduler;
  private redis: Redis;
  private logger: Logger;
  private config: WorkflowEngineConfig;
  private activeExecutions: Map<string, WorkflowExecution>;
  private workflows: Map<string, Workflow>;

  constructor(
    taskQueue: TaskQueue,
    scheduler: Scheduler,
    config: WorkflowEngineConfig,
    logger: Logger,
  ) {
    super();
    this.taskQueue = taskQueue;
    this.scheduler = scheduler;
    this.redis = new Redis(config.redisUrl);
    this.logger = logger.child({ component: 'WorkflowEngine' });
    this.config = config;
    this.activeExecutions = new Map();
    this.workflows = new Map();
  }

  /**
   * Register a workflow definition
   */
  async registerWorkflow(workflow: Workflow): Promise<void> {
    const validated = WorkflowSchema.parse(workflow);

    // Validate DAG (no cycles)
    this.validateDAG(validated);

    this.workflows.set(validated.id, validated);

    // Store in Redis
    await this.redis.set(
      `workflow:${validated.id}`,
      JSON.stringify(validated),
    );

    this.logger.info({ workflowId: validated.id }, 'Workflow registered');
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputs: Record<string, any> = {},
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      tasks: new Map(),
      results: new Map(),
    };

    // Initialize tasks from workflow definition
    for (const taskDef of workflow.tasks) {
      const task: Task = {
        id: `${executionId}:${taskDef.id}`,
        type: taskDef.agentType,
        priority: AgentPriority.NORMAL,
        status: TaskStatus.PENDING,
        input: { ...inputs, ...taskDef.input },
        dependencies: taskDef.dependencies.map((dep) => `${executionId}:${dep}`),
        createdAt: new Date().toISOString(),
        metadata: {
          workflowId,
          executionId,
          taskDefId: taskDef.id,
          condition: taskDef.condition,
        },
      };

      execution.tasks.set(task.id, task);
    }

    this.activeExecutions.set(executionId, execution);

    // Store execution state
    await this.saveExecution(execution);

    // Start execution
    this.logger.info(
      { executionId, workflowId, taskCount: execution.tasks.size },
      'Starting workflow execution',
    );

    execution.status = 'running';
    execution.startedAt = new Date().toISOString();

    this.emit('workflow:started', execution);

    // Execute workflow asynchronously
    this.runWorkflow(execution).catch((error) => {
      this.logger.error({ executionId, error }, 'Workflow execution failed');
      execution.status = 'failed';
      execution.error = (error as Error).message;
      execution.completedAt = new Date().toISOString();
      this.emit('workflow:failed', execution);
    });

    return execution;
  }

  /**
   * Run workflow execution
   */
  private async runWorkflow(execution: WorkflowExecution): Promise<void> {
    const { tasks } = execution;

    // Build DAG
    const dag = this.buildDAG(Array.from(tasks.values()));

    // Get topological order
    const order = this.topologicalSort(dag);

    this.logger.debug(
      { executionId: execution.id, order },
      'Workflow execution order',
    );

    // Execute tasks in topological order
    for (const taskId of order) {
      const task = tasks.get(taskId);
      if (!task) continue;

      try {
        // Check if task should be executed based on condition
        if (task.metadata?.condition) {
          const shouldExecute = this.evaluateCondition(
            task.metadata.condition,
            execution.results,
          );

          if (!shouldExecute) {
            this.logger.debug(
              { taskId, condition: task.metadata.condition },
              'Skipping task due to condition',
            );
            task.status = TaskStatus.CANCELLED;
            continue;
          }
        }

        // Wait for dependencies to complete
        await this.waitForDependencies(task, execution);

        // Merge dependency outputs into task input
        this.mergeDependencyOutputs(task, execution);

        // Schedule and execute task
        const decision = await this.scheduler.schedule(task);
        task.agentId = decision.agentId;

        // Enqueue task
        await this.taskQueue.enqueue(task);

        // Wait for task completion
        const completedTask = await this.waitForTaskCompletion(task);

        // Store results
        execution.results.set(task.id, completedTask.output);

        // Update execution state
        tasks.set(task.id, completedTask);
        await this.saveExecution(execution);

        this.emit('workflow:task:completed', {
          execution,
          task: completedTask,
        });
      } catch (error) {
        this.logger.error(
          { executionId: execution.id, taskId: task.id, error },
          'Task execution failed',
        );

        task.status = TaskStatus.FAILED;
        task.error = (error as Error).message;

        // Fail the entire workflow
        execution.status = 'failed';
        execution.error = `Task ${task.id} failed: ${(error as Error).message}`;
        execution.completedAt = new Date().toISOString();

        await this.saveExecution(execution);
        throw error;
      }
    }

    // Workflow completed successfully
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    await this.saveExecution(execution);

    this.logger.info(
      { executionId: execution.id, duration: this.calculateDuration(execution) },
      'Workflow completed',
    );

    this.emit('workflow:completed', execution);
    this.activeExecutions.delete(execution.id);
  }

  /**
   * Wait for task dependencies to complete
   */
  private async waitForDependencies(
    task: Task,
    execution: WorkflowExecution,
  ): Promise<void> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return;
    }

    this.logger.debug(
      { taskId: task.id, dependencies: task.dependencies },
      'Waiting for dependencies',
    );

    // Poll for dependency completion
    while (true) {
      const allCompleted = task.dependencies.every((depId) => {
        const depTask = execution.tasks.get(depId);
        return depTask?.status === TaskStatus.COMPLETED;
      });

      if (allCompleted) {
        break;
      }

      // Check for failed dependencies
      const anyFailed = task.dependencies.some((depId) => {
        const depTask = execution.tasks.get(depId);
        return depTask?.status === TaskStatus.FAILED;
      });

      if (anyFailed) {
        throw new Error('One or more dependencies failed');
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Merge outputs from dependency tasks into current task input
   */
  private mergeDependencyOutputs(
    task: Task,
    execution: WorkflowExecution,
  ): void {
    if (!task.dependencies || task.dependencies.length === 0) {
      return;
    }

    for (const depId of task.dependencies) {
      const output = execution.results.get(depId);
      if (output) {
        const depTaskDefId = depId.split(':')[1]; // Extract original task ID
        task.input[`${depTaskDefId}_output`] = output;
      }
    }
  }

  /**
   * Wait for a task to complete
   */
  private async waitForTaskCompletion(task: Task): Promise<Task> {
    // Poll for task completion
    while (true) {
      const updatedTask = await this.taskQueue.getTask(task.id);

      if (
        updatedTask &&
        (updatedTask.status === TaskStatus.COMPLETED ||
          updatedTask.status === TaskStatus.FAILED)
      ) {
        return updatedTask;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(
    condition: string,
    results: Map<string, any>,
  ): boolean {
    try {
      // Simple expression evaluation
      // In production, use a proper expression parser/evaluator
      // For now, support basic conditions like: "task1_output.success === true"

      const resultsObj = Object.fromEntries(results);

      // Create a safe evaluation context
      const context = { results: resultsObj };

      // Very basic eval (in production, use a proper expression parser)
      // eslint-disable-next-line no-new-func
      const evaluate = new Function(
        'context',
        `with(context) { return ${condition}; }`,
      );

      return evaluate(context);
    } catch (error) {
      this.logger.warn(
        { condition, error },
        'Failed to evaluate condition, defaulting to true',
      );
      return true;
    }
  }

  /**
   * Build DAG from tasks
   */
  private buildDAG(tasks: Task[]): Map<string, string[]> {
    const dag = new Map<string, string[]>();

    for (const task of tasks) {
      dag.set(task.id, task.dependencies || []);
    }

    return dag;
  }

  /**
   * Topological sort of DAG
   */
  private topologicalSort(dag: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (temp.has(nodeId)) {
        throw new Error('Circular dependency detected in workflow');
      }
      if (visited.has(nodeId)) return;

      temp.add(nodeId);

      const dependencies = dag.get(nodeId) || [];
      for (const depId of dependencies) {
        visit(depId);
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    for (const nodeId of dag.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return result;
  }

  /**
   * Validate that workflow is a valid DAG (no cycles)
   */
  private validateDAG(workflow: Workflow): void {
    const tasks = workflow.tasks;
    const dag = new Map<string, string[]>();

    for (const task of tasks) {
      dag.set(task.id, task.dependencies || []);
    }

    try {
      this.topologicalSort(dag);
    } catch (error) {
      throw new Error(`Invalid workflow DAG: ${(error as Error).message}`);
    }
  }

  /**
   * Get workflow execution
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    // Check active executions first
    const active = this.activeExecutions.get(executionId);
    if (active) return active;

    // Check Redis
    const data = await this.redis.get(`execution:${executionId}`);
    if (!data) return null;

    return this.deserializeExecution(JSON.parse(data));
  }

  /**
   * Cancel a workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date().toISOString();

    // Cancel all pending/running tasks
    for (const [taskId, task] of execution.tasks) {
      if (
        task.status === TaskStatus.PENDING ||
        task.status === TaskStatus.QUEUED ||
        task.status === TaskStatus.RUNNING
      ) {
        await this.taskQueue.cancelTask(taskId);
        task.status = TaskStatus.CANCELLED;
      }
    }

    await this.saveExecution(execution);
    this.activeExecutions.delete(executionId);

    this.logger.info({ executionId }, 'Workflow execution cancelled');
    this.emit('workflow:cancelled', execution);
  }

  /**
   * Save execution state to Redis
   */
  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    const serialized = this.serializeExecution(execution);
    await this.redis.set(
      `execution:${execution.id}`,
      JSON.stringify(serialized),
      'EX',
      86400 * 7, // Keep for 7 days
    );
  }

  /**
   * Serialize execution for storage
   */
  private serializeExecution(execution: WorkflowExecution): any {
    return {
      ...execution,
      tasks: Array.from(execution.tasks.entries()),
      results: Array.from(execution.results.entries()),
    };
  }

  /**
   * Deserialize execution from storage
   */
  private deserializeExecution(data: any): WorkflowExecution {
    return {
      ...data,
      tasks: new Map(data.tasks),
      results: new Map(data.results),
    };
  }

  /**
   * Calculate execution duration
   */
  private calculateDuration(execution: WorkflowExecution): number {
    if (!execution.startedAt || !execution.completedAt) return 0;

    return (
      new Date(execution.completedAt).getTime() -
      new Date(execution.startedAt).getTime()
    );
  }

  /**
   * Close engine
   */
  async close(): Promise<void> {
    await this.redis.quit();
    this.removeAllListeners();
    this.logger.info('WorkflowEngine closed');
  }
}
