"use strict";
/**
 * Self-Healing Engine
 * Automatically detects and recovers from workflow and task failures
 * Supports checkpoint-based recovery, task rerouting, and graceful degradation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfHealingEngine = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
class SelfHealingEngine extends eventemitter3_1.EventEmitter {
    topologyManager;
    failoverController;
    healingRules = [];
    checkpoints = new Map();
    taskCheckpoints = new Map();
    healingHistory = [];
    activeWorkflows = new Map();
    healthStatuses = new Map();
    healingInProgress = new Set();
    MAX_HISTORY_SIZE = 500;
    CHECKPOINT_INTERVAL_MS = 30000;
    HEALTH_CHECK_INTERVAL_MS = 10000;
    MAX_HEALING_ATTEMPTS = 3;
    constructor(topologyManager, failoverController) {
        super();
        this.topologyManager = topologyManager;
        this.failoverController = failoverController;
        this.initializeDefaultRules();
        this.startHealthMonitor();
    }
    initializeDefaultRules() {
        // Rule 1: Retry transient failures
        this.healingRules.push({
            id: (0, uuid_1.v4)(),
            name: 'retry-transient',
            condition: (task) => task.state === 'failed' &&
                task.error?.recoverable === true &&
                (task.checkpoint?.progress ?? 0) > 0,
            strategy: 'retry',
            priority: 1,
        });
        // Rule 2: Reroute on node failure
        this.healingRules.push({
            id: (0, uuid_1.v4)(),
            name: 'reroute-node-failure',
            condition: (task) => task.state === 'failed' &&
                task.error?.code === 'NODE_UNAVAILABLE',
            strategy: 'reroute',
            priority: 2,
        });
        // Rule 3: Failover on network issues
        this.healingRules.push({
            id: (0, uuid_1.v4)(),
            name: 'failover-network',
            condition: (task) => task.state === 'failed' &&
                (task.error?.code === 'NETWORK_ERROR' || task.error?.code === 'TIMEOUT'),
            strategy: 'failover',
            priority: 3,
        });
        // Rule 4: Checkpoint resume for long-running tasks
        this.healingRules.push({
            id: (0, uuid_1.v4)(),
            name: 'checkpoint-resume',
            condition: (task) => task.state === 'failed' &&
                (task.checkpoint?.progress ?? 0) > 25,
            strategy: 'checkpoint-resume',
            priority: 4,
        });
        // Rule 5: Store-forward for connectivity loss
        this.healingRules.push({
            id: (0, uuid_1.v4)(),
            name: 'store-forward',
            condition: (task) => task.state === 'failed' &&
                task.error?.code === 'NO_CONNECTIVITY',
            strategy: 'store-forward',
            priority: 5,
        });
        // Rule 6: Graceful degradation as last resort
        this.healingRules.push({
            id: (0, uuid_1.v4)(),
            name: 'degrade-gracefully',
            condition: (task) => task.state === 'failed',
            strategy: 'degrade-gracefully',
            priority: 100,
        });
    }
    /**
     * Register a workflow for monitoring and healing
     */
    registerWorkflow(workflow) {
        this.activeWorkflows.set(workflow.id, workflow);
        this.createCheckpoint(workflow);
        logger_js_1.logger.info('Workflow registered for healing', { workflowId: workflow.id });
    }
    /**
     * Unregister a workflow
     */
    unregisterWorkflow(workflowId) {
        this.activeWorkflows.delete(workflowId);
        this.checkpoints.delete(workflowId);
    }
    /**
     * Handle a task failure and attempt healing
     */
    async handleTaskFailure(task) {
        const workflow = this.activeWorkflows.get(task.workflowId);
        if (!workflow) {
            logger_js_1.logger.warn('Workflow not found for failed task', { taskId: task.id });
            return null;
        }
        // Prevent concurrent healing attempts
        const healingKey = `${workflow.id}:${task.id}`;
        if (this.healingInProgress.has(healingKey)) {
            logger_js_1.logger.debug('Healing already in progress', { taskId: task.id });
            return null;
        }
        this.healingInProgress.add(healingKey);
        try {
            // Find applicable healing rule
            const rule = this.findApplicableRule(task, workflow);
            if (!rule) {
                logger_js_1.logger.warn('No healing rule applicable', { taskId: task.id });
                return null;
            }
            // Execute healing strategy
            const action = await this.executeHealing(task, workflow, rule.strategy);
            return action;
        }
        finally {
            this.healingInProgress.delete(healingKey);
        }
    }
    /**
     * Handle workflow-level failure
     */
    async handleWorkflowFailure(workflowId, reason) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            return;
        }
        // Try to restore from checkpoint
        const checkpoint = this.checkpoints.get(workflowId);
        if (checkpoint) {
            await this.restoreFromCheckpoint(checkpoint);
        }
        else {
            this.emit('workflow:degraded', workflowId, reason);
        }
    }
    /**
     * Create a checkpoint for a workflow
     */
    createCheckpoint(workflow, taskId) {
        const checkpoint = {
            id: (0, uuid_1.v4)(),
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
        logger_js_1.logger.debug('Checkpoint created', { workflowId: workflow.id, checkpointId: checkpoint.id });
        return checkpoint;
    }
    /**
     * Create a task-level checkpoint
     */
    createTaskCheckpoint(taskId, progress, state) {
        const checkpoint = {
            id: (0, uuid_1.v4)(),
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
    async restoreFromCheckpoint(checkpoint) {
        const workflow = this.activeWorkflows.get(checkpoint.workflowId);
        if (!workflow) {
            logger_js_1.logger.error('Cannot restore - workflow not found', { workflowId: checkpoint.workflowId });
            return;
        }
        this.emit('checkpoint:restored', checkpoint);
        // Restore task states
        const savedStates = checkpoint.state.taskStates;
        for (const saved of savedStates) {
            const task = workflow.tasks.find(t => t.id === saved.id);
            if (task) {
                // Only restore if task is in a recoverable state
                if (task.state === 'failed' || task.state === 'running') {
                    task.state = saved.state;
                    if (saved.output) {
                        task.output = saved.output;
                    }
                }
            }
        }
        workflow.state = 'healing';
        this.emit('workflow:recovered', workflow.id);
        logger_js_1.logger.info('Workflow restored from checkpoint', {
            workflowId: workflow.id,
            checkpointId: checkpoint.id,
        });
    }
    /**
     * Update health status for a node
     */
    updateHealthStatus(status) {
        this.healthStatuses.set(status.nodeId, status);
        // Check if any workflows are affected by unhealthy nodes
        if (!status.healthy) {
            this.handleUnhealthyNode(status.nodeId);
        }
    }
    findApplicableRule(task, workflow) {
        const sortedRules = [...this.healingRules].sort((a, b) => a.priority - b.priority);
        for (const rule of sortedRules) {
            if (rule.condition(task, workflow)) {
                return rule;
            }
        }
        return null;
    }
    async executeHealing(task, workflow, strategy) {
        const action = {
            id: (0, uuid_1.v4)(),
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            action.details.error = message;
            this.emit('healing:failed', action, message);
        }
        this.addToHistory(action);
        return action;
    }
    async executeRetry(task, workflow) {
        const retryCount = task.error?.retryCount ?? 0;
        if (retryCount >= task.retryPolicy.maxRetries) {
            throw new Error('Max retries exceeded');
        }
        // Calculate backoff delay
        const delay = Math.min(task.retryPolicy.baseDelayMs * Math.pow(task.retryPolicy.backoffMultiplier, retryCount), task.retryPolicy.maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Reset task for retry
        task.state = 'retrying';
        task.error = undefined;
        task.retryCount = retryCount + 1;
        logger_js_1.logger.info('Task queued for retry', { taskId: task.id, retryCount: retryCount + 1 });
    }
    async executeReroute(task, workflow) {
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
        const route = this.topologyManager.calculateRoute(this.getLocalNodeId(), bestNode.id);
        if (!route) {
            throw new Error('Could not calculate route to alternative node');
        }
        task.assignedNode = bestNode.id;
        task.state = 'pending';
        logger_js_1.logger.info('Task rerouted', { taskId: task.id, newNode: bestNode.id });
    }
    async executeFailover(task, workflow) {
        const bestChannel = this.failoverController.getBestAvailableChannel();
        const currentChannel = this.failoverController.getActiveChannel();
        if (bestChannel === currentChannel) {
            throw new Error('No alternative channel available');
        }
        await this.failoverController.manualFailover(bestChannel, 'Task healing');
        // Reset task
        task.state = 'pending';
        logger_js_1.logger.info('Task failed over to new channel', { taskId: task.id, channel: bestChannel });
    }
    async executeCheckpointResume(task, workflow) {
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
        logger_js_1.logger.info('Task resumed from checkpoint', {
            taskId: task.id,
            progress: taskCheckpoint.progress,
        });
    }
    async executeStoreForward(task, workflow) {
        // Mark task for store-and-forward processing
        task.state = 'checkpointed';
        // Create checkpoint with current state
        this.createTaskCheckpoint(task.id, 0, task.input);
        workflow.state = 'paused';
        logger_js_1.logger.info('Task queued for store-forward', { taskId: task.id });
    }
    async executeDegradeGracefully(task, workflow) {
        // Mark task as skipped
        task.state = 'skipped';
        task.output = {
            _degraded: true,
            _reason: task.error?.message ?? 'Task could not be completed',
            _timestamp: new Date().toISOString(),
        };
        // Check if workflow can continue
        const remainingTasks = workflow.tasks.filter(t => t.state !== 'completed' && t.state !== 'skipped');
        if (remainingTasks.length === 0) {
            workflow.state = 'completed';
        }
        this.emit('workflow:degraded', workflow.id, 'Task skipped due to unrecoverable failure');
        logger_js_1.logger.warn('Task degraded gracefully', { taskId: task.id, workflowId: workflow.id });
    }
    handleUnhealthyNode(nodeId) {
        // Find workflows with tasks assigned to the unhealthy node
        for (const workflow of this.activeWorkflows.values()) {
            const affectedTasks = workflow.tasks.filter(t => t.assignedNode === nodeId && t.state === 'running');
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
    startHealthMonitor() {
        setInterval(() => {
            // Create periodic checkpoints for active workflows
            for (const workflow of this.activeWorkflows.values()) {
                if (workflow.state === 'running') {
                    this.createCheckpoint(workflow);
                }
            }
        }, this.CHECKPOINT_INTERVAL_MS);
    }
    getLocalNodeId() {
        // In production, this would return the actual node ID
        return process.env.NODE_ID ?? 'local-node';
    }
    addToHistory(action) {
        this.healingHistory.push(action);
        if (this.healingHistory.length > this.MAX_HISTORY_SIZE) {
            this.healingHistory.shift();
        }
    }
    /**
     * Get healing statistics
     */
    getHealingStats() {
        const total = this.healingHistory.length;
        const successful = this.healingHistory.filter(a => a.success).length;
        const byStrategy = {
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
        for (const strategy of Object.keys(byStrategy)) {
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
    dispose() {
        this.removeAllListeners();
    }
}
exports.SelfHealingEngine = SelfHealingEngine;
