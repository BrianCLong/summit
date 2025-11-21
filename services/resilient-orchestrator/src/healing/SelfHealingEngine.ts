/**
 * Self-Healing Engine
 * Automatically detects and recovers from workflow and task failures
 * Supports checkpoint-based recovery, task rerouting, and graceful degradation
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import type {
  Workflow,
  Task,
  HealingStrategy,
  HealingAction,
  HealthStatus,
  Checkpoint,
  TaskCheckpoint,
  NetworkCondition,
} from '../types.js';
import { NetworkTopologyManager } from '../routing/NetworkTopologyManager.js';
import { FailoverController } from '../comms/FailoverController.js';
import { logger } from '../utils/logger.js';

interface HealingEvents {
  'healing:started': (action: HealingAction) => void;
  'healing:completed': (action: HealingAction) => void;
  'healing:failed': (action: HealingAction, error: string) => void;
  'checkpoint:created': (checkpoint: Checkpoint) => void;
  'checkpoint:restored': (checkpoint: Checkpoint) => void;
  'workflow:recovered': (workflowId: string) => void;
  'workflow:degraded': (workflowId: string, reason: string) => void;
}

interface HealingRule {
  id: string;
  name: string;
  condition: (task: Task, workflow: Workflow) => boolean;
  strategy: HealingStrategy;
  priority: number;
}

export class SelfHealingEngine extends EventEmitter<HealingEvents> {
  private topologyManager: NetworkTopologyManager;
  private failoverController: FailoverController;
  private healingRules: HealingRule[] = [];
  private checkpoints: Map<string, Checkpoint> = new Map();
  private taskCheckpoints: Map<string, TaskCheckpoint> = new Map();
  private healingHistory: HealingAction[] = [];
  private activeWorkflows: Map<string, Workflow> = new Map();
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private healingInProgress: Set<string> = new Set();

  private readonly MAX_HISTORY_SIZE = 500;
  private readonly CHECKPOINT_INTERVAL_MS = 30000;
  private readonly HEALTH_CHECK_INTERVAL_MS = 10000;
  private readonly MAX_HEALING_ATTEMPTS = 3;

  constructor(
    topologyManager: NetworkTopologyManager,
    failoverController: FailoverController
  ) {
    super();
    this.topologyManager = topologyManager;
    this.failoverController = failoverController;
    this.initializeDefaultRules();
    this.startHealthMonitor();
  }

  private initializeDefaultRules(): void {
    // Rule 1: Retry transient failures
    this.healingRules.push({
      id: uuid(),
      name: 'retry-transient',
      condition: (task) =>
        task.state === 'failed' &&
        task.error?.recoverable === true &&
        (task.checkpoint?.progress ?? 0) > 0,
      strategy: 'retry',
      priority: 1,
    });

    // Rule 2: Reroute on node failure
    this.healingRules.push({
      id: uuid(),
      name: 'reroute-node-failure',
      condition: (task) =>
        task.state === 'failed' &&
        task.error?.code === 'NODE_UNAVAILABLE',
      strategy: 'reroute',
      priority: 2,
    });

    // Rule 3: Failover on network issues
    this.healingRules.push({
      id: uuid(),
      name: 'failover-network',
      condition: (task) =>
        task.state === 'failed' &&
        (task.error?.code === 'NETWORK_ERROR' || task.error?.code === 'TIMEOUT'),
      strategy: 'failover',
      priority: 3,
    });

    // Rule 4: Checkpoint resume for long-running tasks
    this.healingRules.push({
      id: uuid(),
      name: 'checkpoint-resume',
      condition: (task) =>
        task.state === 'failed' &&
        (task.checkpoint?.progress ?? 0) > 25,
      strategy: 'checkpoint-resume',
      priority: 4,
    });

    // Rule 5: Store-forward for connectivity loss
    this.healingRules.push({
      id: uuid(),
      name: 'store-forward',
      condition: (task) =>
        task.state === 'failed' &&
        task.error?.code === 'NO_CONNECTIVITY',
      strategy: 'store-forward',
      priority: 5,
    });

    // Rule 6: Graceful degradation as last resort
    this.healingRules.push({
      id: uuid(),
      name: 'degrade-gracefully',
      condition: (task) => task.state === 'failed',
      strategy: 'degrade-gracefully',
      priority: 100,
    });
  }

  /**
   * Register a workflow for monitoring and healing
   */
  registerWorkflow(workflow: Workflow): void {
    this.activeWorkflows.set(workflow.id, workflow);
    this.createCheckpoint(workflow);
    logger.info('Workflow registered for healing', { workflowId: workflow.id });
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    this.activeWorkflows.delete(workflowId);
    this.checkpoints.delete(workflowId);
  }

  /**
   * Handle a task failure and attempt healing
   */
  async handleTaskFailure(task: Task): Promise<HealingAction | null> {
    const workflow = this.activeWorkflows.get(task.workflowId);
    if (!workflow) {
      logger.warn('Workflow not found for failed task', { taskId: task.id });
      return null;
    }

    // Prevent concurrent healing attempts
    const healingKey = `${workflow.id}:${task.id}`;
    if (this.healingInProgress.has(healingKey)) {
      logger.debug('Healing already in progress', { taskId: task.id });
      return null;
    }

    this.healingInProgress.add(healingKey);

    try {
      // Find applicable healing rule
      const rule = this.findApplicableRule(task, workflow);
      if (!rule) {
        logger.warn('No healing rule applicable', { taskId: task.id });
        return null;
      }

      // Execute healing strategy
      const action = await this.executeHealing(task, workflow, rule.strategy);
      return action;
    } finally {
      this.healingInProgress.delete(healingKey);
    }
  }

  /**
   * Handle workflow-level failure
   */
  async handleWorkflowFailure(workflowId: string, reason: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return;

    // Try to restore from checkpoint
    const checkpoint = this.checkpoints.get(workflowId);
    if (checkpoint) {
      await this.restoreFromCheckpoint(checkpoint);
    } else {
      this.emit('workflow:degraded', workflowId, reason);
    }
  }

  /**
   * Create a checkpoint for a workflow
   */
  createCheckpoint(workflow: Workflow, taskId?: string): Checkpoint {
    const checkpoint: Checkpoint = {
      id: uuid(),
      workflowId: workflow.id,
      taskId: taskId ?? workflow.tasks.find(t => t.state === 'running')?.id ?? '',
      state: {
        workflowState: workflow.state,
        taskStates: workflow.tasks.map(t => ({ id: t.id, state: t.state, output: t.output })),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
      nodeId: this.getLocalNodeId(),
    };

    this.checkpoints.set(workflow.id, checkpoint);
    this.emit('checkpoint:created', checkpoint);

    logger.debug('Checkpoint created', { workflowId: workflow.id, checkpointId: checkpoint.id });
    return checkpoint;
  }

  /**
   * Create a task-level checkpoint
   */
  createTaskCheckpoint(taskId: string, progress: number, state: Record<string, unknown>): void {
    const checkpoint: TaskCheckpoint = {
      id: uuid(),
      taskId,
      progress,
      state,
      timestamp: new Date(),
    };

    this.taskCheckpoints.set(taskId, checkpoint);
  }

  /**
   * Restore workflow from checkpoint
   */
  async restoreFromCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const workflow = this.activeWorkflows.get(checkpoint.workflowId);
    if (!workflow) {
      logger.error('Cannot restore - workflow not found', { workflowId: checkpoint.workflowId });
      return;
    }

    this.emit('checkpoint:restored', checkpoint);

    // Restore task states
    const savedStates = checkpoint.state.taskStates as Array<{
      id: string;
      state: string;
      output?: Record<string, unknown>;
    }>;

    for (const saved of savedStates) {
      const task = workflow.tasks.find(t => t.id === saved.id);
      if (task) {
        // Only restore if task is in a recoverable state
        if (task.state === 'failed' || task.state === 'running') {
          task.state = saved.state as Task['state'];
          if (saved.output) task.output = saved.output;
        }
      }
    }

    workflow.state = 'healing';
    this.emit('workflow:recovered', workflow.id);

    logger.info('Workflow restored from checkpoint', {
      workflowId: workflow.id,
      checkpointId: checkpoint.id,
    });
  }

  /**
   * Update health status for a node
   */
  updateHealthStatus(status: HealthStatus): void {
    this.healthStatuses.set(status.nodeId, status);

    // Check if any workflows are affected by unhealthy nodes
    if (!status.healthy) {
      this.handleUnhealthyNode(status.nodeId);
    }
  }

  private findApplicableRule(task: Task, workflow: Workflow): HealingRule | null {
    const sortedRules = [...this.healingRules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (rule.condition(task, workflow)) {
        return rule;
      }
    }

    return null;
  }

  private async executeHealing(
    task: Task,
    workflow: Workflow,
    strategy: HealingStrategy
  ): Promise<HealingAction> {
    const action: HealingAction = {
      id: uuid(),
      strategy,
      targetId: task.id,
      targetType: 'task',
      reason: task.error?.message ?? 'Unknown error',
      timestamp: new Date(),
      success: false,
      details: {},
    };

    this.emit('healing:started', action);

    try {
      switch (strategy) {
        case 'retry':
          await this.executeRetry(task, workflow);
          break;
        case 'reroute':
          await this.executeReroute(task, workflow);
          break;
        case 'failover':
          await this.executeFailover(task, workflow);
          break;
        case 'checkpoint-resume':
          await this.executeCheckpointResume(task, workflow);
          break;
        case 'store-forward':
          await this.executeStoreForward(task, workflow);
          break;
        case 'degrade-gracefully':
          await this.executeDegradeGracefully(task, workflow);
          break;
      }

      action.success = true;
      this.emit('healing:completed', action);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      action.details.error = message;
      this.emit('healing:failed', action, message);
    }

    this.addToHistory(action);
    return action;
  }

  private async executeRetry(task: Task, workflow: Workflow): Promise<void> {
    const retryCount = (task.error as any)?.retryCount ?? 0;

    if (retryCount >= task.retryPolicy.maxRetries) {
      throw new Error('Max retries exceeded');
    }

    // Calculate backoff delay
    const delay = Math.min(
      task.retryPolicy.baseDelayMs * Math.pow(task.retryPolicy.backoffMultiplier, retryCount),
      task.retryPolicy.maxDelayMs
    );

    await new Promise(resolve => setTimeout(resolve, delay));

    // Reset task for retry
    task.state = 'retrying';
    task.error = undefined;
    (task as any).retryCount = retryCount + 1;

    logger.info('Task queued for retry', { taskId: task.id, retryCount: retryCount + 1 });
  }

  private async executeReroute(task: Task, workflow: Workflow): Promise<void> {
    // Find alternative node
    const currentNode = task.assignedNode;
    const availableNodes = this.topologyManager
      .getNodesByType('field')
      .filter(n => n.id !== currentNode && n.condition !== 'offline');

    if (availableNodes.length === 0) {
      throw new Error('No alternative nodes available');
    }

    // Select best node
    const bestNode = availableNodes.sort((a, b) => b.priority - a.priority)[0];

    // Calculate new route
    const route = this.topologyManager.calculateRoute(
      this.getLocalNodeId(),
      bestNode.id
    );

    if (!route) {
      throw new Error('Could not calculate route to alternative node');
    }

    task.assignedNode = bestNode.id;
    task.state = 'pending';

    logger.info('Task rerouted', { taskId: task.id, newNode: bestNode.id });
  }

  private async executeFailover(task: Task, workflow: Workflow): Promise<void> {
    const bestChannel = this.failoverController.getBestAvailableChannel();
    const currentChannel = this.failoverController.getActiveChannel();

    if (bestChannel === currentChannel) {
      throw new Error('No alternative channel available');
    }

    await this.failoverController.manualFailover(bestChannel, 'Task healing');

    // Reset task
    task.state = 'pending';

    logger.info('Task failed over to new channel', { taskId: task.id, channel: bestChannel });
  }

  private async executeCheckpointResume(task: Task, workflow: Workflow): Promise<void> {
    const taskCheckpoint = this.taskCheckpoints.get(task.id);

    if (!taskCheckpoint) {
      throw new Error('No checkpoint available for task');
    }

    // Restore task state from checkpoint
    task.state = 'pending';
    task.input = {
      ...task.input,
      _checkpoint: taskCheckpoint.state,
      _resumeFrom: taskCheckpoint.progress,
    };

    logger.info('Task resumed from checkpoint', {
      taskId: task.id,
      progress: taskCheckpoint.progress,
    });
  }

  private async executeStoreForward(task: Task, workflow: Workflow): Promise<void> {
    // Mark task for store-and-forward processing
    task.state = 'checkpointed';

    // Create checkpoint with current state
    this.createTaskCheckpoint(task.id, 0, task.input);

    workflow.state = 'paused';

    logger.info('Task queued for store-forward', { taskId: task.id });
  }

  private async executeDegradeGracefully(task: Task, workflow: Workflow): Promise<void> {
    // Mark task as skipped
    task.state = 'skipped';
    task.output = {
      _degraded: true,
      _reason: task.error?.message ?? 'Task could not be completed',
      _timestamp: new Date().toISOString(),
    };

    // Check if workflow can continue
    const remainingTasks = workflow.tasks.filter(
      t => t.state !== 'completed' && t.state !== 'skipped'
    );

    if (remainingTasks.length === 0) {
      workflow.state = 'completed';
    }

    this.emit('workflow:degraded', workflow.id, 'Task skipped due to unrecoverable failure');

    logger.warn('Task degraded gracefully', { taskId: task.id, workflowId: workflow.id });
  }

  private handleUnhealthyNode(nodeId: string): void {
    // Find workflows with tasks assigned to the unhealthy node
    for (const workflow of this.activeWorkflows.values()) {
      const affectedTasks = workflow.tasks.filter(
        t => t.assignedNode === nodeId && t.state === 'running'
      );

      for (const task of affectedTasks) {
        task.error = {
          code: 'NODE_UNAVAILABLE',
          message: `Node ${nodeId} became unhealthy`,
          recoverable: true,
          timestamp: new Date(),
        };
        task.state = 'failed';
        this.handleTaskFailure(task);
      }
    }
  }

  private startHealthMonitor(): void {
    setInterval(() => {
      // Create periodic checkpoints for active workflows
      for (const workflow of this.activeWorkflows.values()) {
        if (workflow.state === 'running') {
          this.createCheckpoint(workflow);
        }
      }
    }, this.CHECKPOINT_INTERVAL_MS);
  }

  private getLocalNodeId(): string {
    // In production, this would return the actual node ID
    return process.env.NODE_ID ?? 'local-node';
  }

  private addToHistory(action: HealingAction): void {
    this.healingHistory.push(action);
    if (this.healingHistory.length > this.MAX_HISTORY_SIZE) {
      this.healingHistory.shift();
    }
  }

  /**
   * Get healing statistics
   */
  getHealingStats(): {
    totalActions: number;
    successRate: number;
    byStrategy: Record<HealingStrategy, { count: number; successRate: number }>;
    recent: HealingAction[];
  } {
    const total = this.healingHistory.length;
    const successful = this.healingHistory.filter(a => a.success).length;

    const byStrategy: Record<HealingStrategy, { count: number; successRate: number }> = {
      retry: { count: 0, successRate: 0 },
      reroute: { count: 0, successRate: 0 },
      failover: { count: 0, successRate: 0 },
      'checkpoint-resume': { count: 0, successRate: 0 },
      'degrade-gracefully': { count: 0, successRate: 0 },
      'store-forward': { count: 0, successRate: 0 },
    };

    for (const action of this.healingHistory) {
      byStrategy[action.strategy].count++;
      if (action.success) {
        byStrategy[action.strategy].successRate++;
      }
    }

    // Calculate success rates
    for (const strategy of Object.keys(byStrategy) as HealingStrategy[]) {
      const stats = byStrategy[strategy];
      stats.successRate = stats.count > 0 ? stats.successRate / stats.count : 0;
    }

    return {
      totalActions: total,
      successRate: total > 0 ? successful / total : 0,
      byStrategy,
      recent: this.healingHistory.slice(-10).reverse(),
    };
  }

  dispose(): void {
    this.removeAllListeners();
  }
}
