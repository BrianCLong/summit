/**
 * Base Agent Implementation
 * Abstract base class for all agent types
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import {
  IAgent,
  AgentConfig,
  AgentState,
  AgentMetrics,
  Task,
  TaskStatus,
  AgentMessage,
  AgentEventType,
  AgentEvent,
  AgentContext,
} from '../types/agent.types.js';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  public readonly id: string;
  public readonly config: AgentConfig;
  public state: AgentState;
  public metrics: AgentMetrics;
  protected context: AgentContext;
  protected logger: Logger;
  protected activeTasks: Map<string, Task>;
  protected startTime?: Date;

  constructor(config: AgentConfig, logger: Logger) {
    super();
    this.id = config.id;
    this.config = config;
    this.state = AgentState.IDLE;
    this.logger = logger.child({ agentId: this.id, agentType: config.type });
    this.activeTasks = new Map();

    // Initialize metrics
    this.metrics = {
      agentId: this.id,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      apiCallsCount: 0,
      apiCostUSD: 0,
      healthStatus: 'healthy',
    };

    // Initialize context
    this.context = {
      agentId: this.id,
      conversationHistory: [],
      workingMemory: {},
    };
  }

  // ===== Lifecycle Methods =====

  async initialize(): Promise<void> {
    this.logger.info('Initializing agent');
    this.state = AgentState.INITIALIZING;
    this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });

    try {
      await this.onInitialize();
      this.state = AgentState.READY;
      this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });
      this.logger.info('Agent initialized successfully');
    } catch (error) {
      this.state = AgentState.ERROR;
      this.logger.error(error, 'Failed to initialize agent');
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.state !== AgentState.READY && this.state !== AgentState.PAUSED) {
      throw new Error(
        `Cannot start agent from state: ${this.state}. Must be READY or PAUSED`,
      );
    }

    this.logger.info('Starting agent');
    this.startTime = new Date();
    this.state = AgentState.READY;
    this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });

    await this.onStart();
  }

  async pause(): Promise<void> {
    this.logger.info('Pausing agent');
    this.state = AgentState.PAUSED;
    this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });
    await this.onPause();
  }

  async resume(): Promise<void> {
    this.logger.info('Resuming agent');
    this.state = AgentState.READY;
    this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });
    await this.onResume();
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping agent');

    // Wait for active tasks to complete
    if (this.activeTasks.size > 0) {
      this.logger.info(
        `Waiting for ${this.activeTasks.size} active tasks to complete`,
      );
      // Give tasks time to complete gracefully
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    this.state = AgentState.IDLE;
    this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });
    await this.onStop();
  }

  async terminate(): Promise<void> {
    this.logger.warn('Terminating agent');
    this.state = AgentState.TERMINATED;
    this.emitEvent(AgentEventType.STATE_CHANGED, { state: this.state });

    // Cancel all active tasks
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.status = TaskStatus.CANCELLED;
      this.activeTasks.delete(taskId);
    }

    await this.onTerminate();
    this.removeAllListeners();
  }

  // ===== Task Execution =====

  async executeTask(task: Task): Promise<Task> {
    if (this.state !== AgentState.READY && this.state !== AgentState.WORKING) {
      throw new Error(
        `Agent is not ready to execute tasks. Current state: ${this.state}`,
      );
    }

    // Check resource limits
    if (this.config.resources) {
      if (this.activeTasks.size >= this.config.resources.maxConcurrentTasks) {
        throw new Error('Max concurrent tasks limit reached');
      }
    }

    this.logger.info({ taskId: task.id }, 'Executing task');
    this.state = AgentState.WORKING;
    this.activeTasks.set(task.id, task);

    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date().toISOString();
    task.agentId = this.id;

    this.emitEvent(AgentEventType.TASK_STARTED, { task });

    const startTime = Date.now();

    try {
      // Check for timeout
      const timeout =
        this.config.resources?.timeout || 300000; // Default 5 minutes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), timeout);
      });

      const result = await Promise.race([
        this.onExecuteTask(task),
        timeoutPromise,
      ]);

      task.status = TaskStatus.COMPLETED;
      task.output = result;
      task.completedAt = new Date().toISOString();

      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);

      this.logger.info({ taskId: task.id, executionTime }, 'Task completed');
      this.emitEvent(AgentEventType.TASK_COMPLETED, { task, executionTime });

      return task;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      task.status = TaskStatus.FAILED;
      task.error = (error as Error).message;
      task.completedAt = new Date().toISOString();

      this.updateMetrics(false, executionTime);

      this.logger.error(
        { taskId: task.id, error },
        'Task execution failed',
      );
      this.emitEvent(AgentEventType.TASK_FAILED, { task, error });

      throw error;
    } finally {
      this.activeTasks.delete(task.id);
      if (this.activeTasks.size === 0) {
        this.state = AgentState.READY;
      }
    }
  }

  canHandleTask(task: Task): boolean {
    // Check if agent has required capabilities
    return this.onCanHandleTask(task);
  }

  // ===== Communication =====

  async sendMessage(message: AgentMessage): Promise<void> {
    this.logger.debug({ message }, 'Sending message');
    this.emitEvent(AgentEventType.MESSAGE_SENT, { message });
    await this.onSendMessage(message);
  }

  async receiveMessage(message: AgentMessage): Promise<void> {
    this.logger.debug({ message }, 'Received message');
    this.emitEvent(AgentEventType.MESSAGE_RECEIVED, { message });
    await this.onReceiveMessage(message);
  }

  // ===== Health & Metrics =====

  async healthCheck(): Promise<boolean> {
    try {
      const healthy = await this.onHealthCheck();
      this.metrics.healthStatus = healthy ? 'healthy' : 'unhealthy';
      this.metrics.lastHealthCheck = new Date().toISOString();

      this.emitEvent(AgentEventType.HEALTH_CHECK_COMPLETED, {
        healthy,
        metrics: this.metrics,
      });

      return healthy;
    } catch (error) {
      this.metrics.healthStatus = 'unhealthy';
      this.logger.error(error, 'Health check failed');
      return false;
    }
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  protected updateMetrics(success: boolean, executionTime: number): void {
    if (success) {
      this.metrics.tasksCompleted++;
    } else {
      this.metrics.tasksFailed++;
    }

    this.metrics.totalExecutionTime += executionTime;
    const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksFailed;
    this.metrics.averageExecutionTime =
      this.metrics.totalExecutionTime / totalTasks;
  }

  protected updateApiMetrics(calls: number, costUSD: number): void {
    this.metrics.apiCallsCount += calls;
    this.metrics.apiCostUSD += costUSD;
  }

  protected emitEvent(type: AgentEventType, data: any): void {
    const event: AgentEvent = {
      type,
      agentId: this.id,
      timestamp: new Date().toISOString(),
      data,
    };
    this.emit('event', event);
  }

  // ===== Context Management =====

  protected updateContext(updates: Partial<AgentContext>): void {
    this.context = { ...this.context, ...updates };
  }

  protected addToWorkingMemory(key: string, value: any): void {
    this.context.workingMemory[key] = value;
  }

  protected getFromWorkingMemory(key: string): any {
    return this.context.workingMemory[key];
  }

  protected clearWorkingMemory(): void {
    this.context.workingMemory = {};
  }

  // ===== Abstract Methods (to be implemented by subclasses) =====

  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onPause(): Promise<void>;
  protected abstract onResume(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onTerminate(): Promise<void>;
  protected abstract onExecuteTask(task: Task): Promise<any>;
  protected abstract onCanHandleTask(task: Task): boolean;
  protected abstract onSendMessage(message: AgentMessage): Promise<void>;
  protected abstract onReceiveMessage(message: AgentMessage): Promise<void>;
  protected abstract onHealthCheck(): Promise<boolean>;
}
