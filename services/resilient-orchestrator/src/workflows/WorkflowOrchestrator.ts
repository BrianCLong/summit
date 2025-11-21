/**
 * Workflow Orchestrator
 * Main orchestration engine that coordinates all components for
 * resilient, real-time workflow execution at scale
 */

import { EventEmitter } from 'eventemitter3';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { v4 as uuid } from 'uuid';
import type {
  Workflow,
  Task,
  WorkflowState,
  TaskState,
  NetworkCondition,
  RetryPolicy,
} from '../types.js';
import { NetworkTopologyManager } from '../routing/NetworkTopologyManager.js';
import { SatelliteCommHandler } from '../comms/SatelliteCommHandler.js';
import { FailoverController } from '../comms/FailoverController.js';
import { SelfHealingEngine } from '../healing/SelfHealingEngine.js';
import { CommandReporter } from '../reporting/CommandReporter.js';
import { CoalitionFederator } from '../federation/CoalitionFederator.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../utils/metrics.js';

interface OrchestratorEvents {
  'workflow:started': (workflow: Workflow) => void;
  'workflow:completed': (workflow: Workflow) => void;
  'workflow:failed': (workflow: Workflow, error: string) => void;
  'workflow:paused': (workflow: Workflow) => void;
  'task:started': (task: Task) => void;
  'task:completed': (task: Task) => void;
  'task:failed': (task: Task, error: string) => void;
  'system:degraded': (reason: string) => void;
  'system:recovered': () => void;
}

interface OrchestratorConfig {
  redisUrl: string;
  nodeId: string;
  reportingPort?: number;
  maxConcurrentWorkflows: number;
  maxConcurrentTasks: number;
  defaultRetryPolicy: RetryPolicy;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  nodeId: process.env.NODE_ID ?? `node-${uuid().slice(0, 8)}`,
  reportingPort: parseInt(process.env.REPORTING_PORT ?? '8080'),
  maxConcurrentWorkflows: 100,
  maxConcurrentTasks: 1000,
  defaultRetryPolicy: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'TRANSIENT'],
  },
};

export class WorkflowOrchestrator extends EventEmitter<OrchestratorEvents> {
  private config: OrchestratorConfig;
  private redis: Redis;
  private workflowQueue: Queue;
  private taskQueue: Queue;
  private worker?: Worker;

  // Core components
  private topologyManager: NetworkTopologyManager;
  private satelliteHandler: SatelliteCommHandler;
  private failoverController: FailoverController;
  private healingEngine: SelfHealingEngine;
  private commandReporter: CommandReporter;
  private coalitionFederator: CoalitionFederator;

  // State tracking
  private workflows: Map<string, Workflow> = new Map();
  private running: boolean = false;
  private degraded: boolean = false;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize Redis
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    // Initialize queues
    this.workflowQueue = new Queue('resilient-workflows', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    this.taskQueue = new Queue('resilient-tasks', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });

    // Initialize components
    this.topologyManager = new NetworkTopologyManager();
    this.satelliteHandler = new SatelliteCommHandler();
    this.failoverController = new FailoverController(
      this.topologyManager,
      this.satelliteHandler
    );
    this.healingEngine = new SelfHealingEngine(
      this.topologyManager,
      this.failoverController
    );
    this.commandReporter = new CommandReporter({
      port: this.config.reportingPort,
      satelliteHandler: this.satelliteHandler,
    });
    this.coalitionFederator = new CoalitionFederator();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Topology events
    this.topologyManager.on('topology:degraded', (nodeIds) => {
      this.handleTopologyDegraded(nodeIds);
    });

    this.topologyManager.on('topology:recovered', (nodeIds) => {
      this.handleTopologyRecovered(nodeIds);
    });

    // Failover events
    this.failoverController.on('failover:completed', (event) => {
      this.handleFailoverCompleted(event);
    });

    // Healing events
    this.healingEngine.on('healing:completed', (action) => {
      this.handleHealingCompleted(action);
    });

    this.healingEngine.on('workflow:recovered', (workflowId) => {
      this.resumeWorkflow(workflowId);
    });

    // Coalition events
    this.coalitionFederator.on('task:result-received', (taskId, partnerId, result) => {
      this.handleFederatedTaskResult(taskId, partnerId, result);
    });
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.running) return;

    logger.info('Starting Workflow Orchestrator', { nodeId: this.config.nodeId });

    // Register this node in topology
    this.topologyManager.registerNode({
      name: this.config.nodeId,
      type: 'command',
      endpoints: [{
        id: uuid(),
        protocol: 'tcp',
        address: 'localhost',
        port: this.config.reportingPort ?? 8080,
        latencyMs: 1,
        bandwidthKbps: 100000,
        available: true,
        securityLevel: 'unclass',
      }],
      condition: 'nominal',
      priority: 10,
      capabilities: ['orchestration', 'reporting', 'healing'],
      metadata: {},
    });

    // Register default failover policy
    this.failoverController.registerPolicy({
      name: 'default',
      triggerConditions: {
        maxLatencyMs: 5000,
        maxPacketLossPercent: 10,
        maxConsecutiveFailures: 3,
        timeoutMs: 30000,
      },
      channelPriority: ['primary', 'secondary', 'satellite', 'mesh', 'store-forward'],
      autoFailback: true,
      failbackDelayMs: 60000,
      notifyOnFailover: true,
    });

    // Start task worker
    this.worker = new Worker(
      'resilient-tasks',
      async (job: Job) => this.processTask(job),
      {
        connection: this.redis,
        concurrency: this.config.maxConcurrentTasks,
      }
    );

    this.worker.on('failed', (job, error) => {
      if (job) this.handleTaskFailure(job.data.taskId, error.message);
    });

    this.running = true;
    logger.info('Workflow Orchestrator started');
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    logger.info('Stopping Workflow Orchestrator');

    await this.worker?.close();
    await this.workflowQueue.close();
    await this.taskQueue.close();
    await this.redis.quit();

    this.topologyManager.dispose();
    this.satelliteHandler.dispose();
    this.failoverController.dispose();
    this.healingEngine.dispose();
    this.commandReporter.dispose();
    this.coalitionFederator.dispose();

    this.running = false;
    logger.info('Workflow Orchestrator stopped');
  }

  /**
   * Submit a new workflow for execution
   */
  async submitWorkflow(workflow: Omit<Workflow, 'id' | 'state' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const fullWorkflow: Workflow = {
      ...workflow,
      id: uuid(),
      state: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: workflow.tasks.map(t => ({
        ...t,
        id: t.id || uuid(),
        workflowId: '',
        state: 'pending' as TaskState,
        retryPolicy: t.retryPolicy || this.config.defaultRetryPolicy,
      })),
    };

    // Set workflow ID on all tasks
    fullWorkflow.tasks.forEach(t => t.workflowId = fullWorkflow.id);

    this.workflows.set(fullWorkflow.id, fullWorkflow);

    // Register with healing engine
    this.healingEngine.registerWorkflow(fullWorkflow);

    // Queue for execution
    await this.workflowQueue.add('workflow', {
      workflowId: fullWorkflow.id,
    });

    metrics.workflowsTotal.inc({ state: 'pending', priority: fullWorkflow.priority });
    metrics.workflowsActive.inc({ state: 'pending' });

    logger.info('Workflow submitted', {
      workflowId: fullWorkflow.id,
      name: fullWorkflow.name,
      taskCount: fullWorkflow.tasks.length,
    });

    return fullWorkflow;
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.state = 'running';
    workflow.updatedAt = new Date();

    this.emit('workflow:started', workflow);

    // Report to command
    await this.commandReporter.sendStatusReport(
      this.config.nodeId,
      workflow.coalitionPartners ?? ['command'],
      workflow
    );

    // Queue ready tasks
    await this.queueReadyTasks(workflow);
  }

  /**
   * Pause a running workflow
   */
  async pauseWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.state = 'paused';
    workflow.updatedAt = new Date();

    // Create checkpoint
    this.healingEngine.createCheckpoint(workflow);

    this.emit('workflow:paused', workflow);
    logger.info('Workflow paused', { workflowId });
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.state = 'running';
    workflow.updatedAt = new Date();

    await this.queueReadyTasks(workflow);
    logger.info('Workflow resumed', { workflowId });
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.state = 'cancelled';
    workflow.updatedAt = new Date();

    // Cancel pending tasks
    for (const task of workflow.tasks) {
      if (task.state === 'pending' || task.state === 'queued') {
        task.state = 'skipped';
      }
    }

    this.healingEngine.unregisterWorkflow(workflowId);
    logger.info('Workflow cancelled', { workflowId });
  }

  /**
   * Get workflow status
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): Workflow[] {
    return Array.from(this.workflows.values()).filter(
      w => w.state === 'running' || w.state === 'paused' || w.state === 'healing'
    );
  }

  /**
   * Delegate a task to coalition partners
   */
  async delegateTaskToCoalition(
    taskId: string,
    partnerIds: string[]
  ): Promise<{ delegated: string[]; failed: string[] }> {
    for (const workflow of this.workflows.values()) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) {
        return this.coalitionFederator.delegateToMultiplePartners(task, partnerIds);
      }
    }
    return { delegated: [], failed: partnerIds };
  }

  private async queueReadyTasks(workflow: Workflow): Promise<void> {
    const readyTasks = workflow.tasks.filter(task => {
      if (task.state !== 'pending') return false;

      // Check dependencies
      const depsCompleted = task.dependencies.every(depId => {
        const depTask = workflow.tasks.find(t => t.id === depId);
        return depTask?.state === 'completed';
      });

      return depsCompleted;
    });

    for (const task of readyTasks) {
      task.state = 'queued';
      await this.taskQueue.add('task', {
        workflowId: workflow.id,
        taskId: task.id,
      }, {
        priority: this.getPriorityValue(workflow.priority),
      });

      metrics.tasksTotal.inc({ state: 'queued', type: task.type });
    }
  }

  private async processTask(job: Job): Promise<void> {
    const { workflowId, taskId } = job.data;

    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.state = 'running';
    task.startedAt = new Date();

    this.emit('task:started', task);

    try {
      // Check network condition
      const networkOk = await this.checkNetworkCondition(task);
      if (!networkOk) {
        throw new Error('Network not available');
      }

      // Execute task (simulated - in production, this would be the actual task execution)
      const result = await this.executeTaskLogic(task);

      task.state = 'completed';
      task.completedAt = new Date();
      task.output = result;

      this.emit('task:completed', task);
      metrics.tasksTotal.inc({ state: 'completed', type: task.type });

      // Create checkpoint after task completion
      this.healingEngine.createTaskCheckpoint(task.id, 100, result);

      // Queue next tasks
      await this.queueReadyTasks(workflow);

      // Check if workflow is complete
      await this.checkWorkflowCompletion(workflow);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      task.state = 'failed';
      task.error = {
        code: this.categorizeError(message),
        message,
        recoverable: this.isRecoverableError(message),
        timestamp: new Date(),
      };

      this.emit('task:failed', task, message);
      metrics.tasksTotal.inc({ state: 'failed', type: task.type });

      // Attempt healing
      await this.healingEngine.handleTaskFailure(task);

      throw error;
    }
  }

  private async executeTaskLogic(task: Task): Promise<Record<string, unknown>> {
    // Simulate task execution
    // In production, this would dispatch to actual task handlers
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    return {
      taskId: task.id,
      executedAt: new Date().toISOString(),
      status: 'success',
    };
  }

  private async checkNetworkCondition(task: Task): Promise<boolean> {
    if (!task.assignedNode) return true;

    const { healthySummary } = this.topologyManager.getTopologySnapshot();
    return healthySummary.healthy > 0 || healthySummary.degraded > 0;
  }

  private async checkWorkflowCompletion(workflow: Workflow): Promise<void> {
    const allDone = workflow.tasks.every(
      t => t.state === 'completed' || t.state === 'skipped' || t.state === 'failed'
    );

    if (!allDone) return;

    const anyFailed = workflow.tasks.some(t => t.state === 'failed');

    if (anyFailed) {
      workflow.state = 'failed';
      this.emit('workflow:failed', workflow, 'One or more tasks failed');

      await this.commandReporter.sendFailureReport(
        this.config.nodeId,
        workflow.coalitionPartners ?? ['command'],
        workflow,
        workflow.tasks.find(t => t.state === 'failed')!,
        'Workflow failed'
      );
    } else {
      workflow.state = 'completed';
      this.emit('workflow:completed', workflow);

      await this.commandReporter.sendCompletionReport(
        this.config.nodeId,
        workflow.coalitionPartners ?? ['command'],
        workflow,
        { tasksCompleted: workflow.tasks.length }
      );
    }

    workflow.updatedAt = new Date();
    metrics.workflowsActive.dec({ state: 'running' });
    metrics.workflowsTotal.inc({ state: workflow.state, priority: workflow.priority });
  }

  private handleTaskFailure(taskId: string, error: string): void {
    for (const workflow of this.workflows.values()) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) {
        metrics.taskRetries.inc({ reason: this.categorizeError(error) });
        break;
      }
    }
  }

  private handleTopologyDegraded(nodeIds: string[]): void {
    this.degraded = true;
    this.emit('system:degraded', `Nodes degraded: ${nodeIds.join(', ')}`);

    // Send alert
    this.commandReporter.sendAlertReport(
      this.config.nodeId,
      ['command'],
      'immediate',
      `Network topology degraded: ${nodeIds.length} nodes affected`,
      { affectedNodes: nodeIds }
    );
  }

  private handleTopologyRecovered(nodeIds: string[]): void {
    const { healthySummary } = this.topologyManager.getTopologySnapshot();

    if (healthySummary.offline === 0 && healthySummary.degraded === 0) {
      this.degraded = false;
      this.emit('system:recovered');
    }
  }

  private handleFailoverCompleted(event: any): void {
    metrics.failoversTotal.inc({
      from_channel: event.fromChannel,
      to_channel: event.toChannel,
      reason: event.reason,
    });

    this.commandReporter.sendAlertReport(
      this.config.nodeId,
      ['command'],
      'priority',
      `Failover completed: ${event.fromChannel} -> ${event.toChannel}`,
      event
    );
  }

  private handleHealingCompleted(action: any): void {
    metrics.healingActionsTotal.inc({
      strategy: action.strategy,
      success: action.success.toString(),
    });

    this.commandReporter.sendHealingReport(
      this.config.nodeId,
      ['command'],
      action
    );
  }

  private handleFederatedTaskResult(taskId: string, partnerId: string, result: unknown): void {
    for (const workflow of this.workflows.values()) {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) {
        task.output = {
          ...task.output,
          [`coalition_${partnerId}`]: result,
        };
        break;
      }
    }
  }

  private getPriorityValue(priority: Workflow['priority']): number {
    const map = { critical: 1, high: 2, normal: 5, low: 10 };
    return map[priority] ?? 5;
  }

  private categorizeError(message: string): string {
    if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR';
    if (message.includes('unavailable')) return 'NODE_UNAVAILABLE';
    if (message.includes('connectivity')) return 'NO_CONNECTIVITY';
    return 'UNKNOWN';
  }

  private isRecoverableError(message: string): boolean {
    const unrecoverable = ['permission', 'invalid', 'not found', 'unauthorized'];
    return !unrecoverable.some(u => message.toLowerCase().includes(u));
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    workflows: { total: number; active: number; completed: number; failed: number };
    tasks: { pending: number; running: number; completed: number; failed: number };
    network: ReturnType<typeof NetworkTopologyManager.prototype.getTopologySnapshot>['healthySummary'];
    healing: ReturnType<typeof SelfHealingEngine.prototype.getHealingStats>;
    federation: ReturnType<typeof CoalitionFederator.prototype.getFederationStats>;
  } {
    const workflows = Array.from(this.workflows.values());
    const allTasks = workflows.flatMap(w => w.tasks);

    return {
      workflows: {
        total: workflows.length,
        active: workflows.filter(w => w.state === 'running').length,
        completed: workflows.filter(w => w.state === 'completed').length,
        failed: workflows.filter(w => w.state === 'failed').length,
      },
      tasks: {
        pending: allTasks.filter(t => t.state === 'pending' || t.state === 'queued').length,
        running: allTasks.filter(t => t.state === 'running').length,
        completed: allTasks.filter(t => t.state === 'completed').length,
        failed: allTasks.filter(t => t.state === 'failed').length,
      },
      network: this.topologyManager.getTopologySnapshot().healthySummary,
      healing: this.healingEngine.getHealingStats(),
      federation: this.coalitionFederator.getFederationStats(),
    };
  }

  // Expose components for advanced usage
  getTopologyManager(): NetworkTopologyManager { return this.topologyManager; }
  getSatelliteHandler(): SatelliteCommHandler { return this.satelliteHandler; }
  getFailoverController(): FailoverController { return this.failoverController; }
  getHealingEngine(): SelfHealingEngine { return this.healingEngine; }
  getCommandReporter(): CommandReporter { return this.commandReporter; }
  getCoalitionFederator(): CoalitionFederator { return this.coalitionFederator; }
}
