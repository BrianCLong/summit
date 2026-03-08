"use strict";
/**
 * Workflow Orchestrator
 * Main orchestration engine that coordinates all components for
 * resilient, real-time workflow execution at scale
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowOrchestrator = void 0;
const eventemitter3_1 = require("eventemitter3");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const NetworkTopologyManager_js_1 = require("../routing/NetworkTopologyManager.js");
const SatelliteCommHandler_js_1 = require("../comms/SatelliteCommHandler.js");
const FailoverController_js_1 = require("../comms/FailoverController.js");
const SelfHealingEngine_js_1 = require("../healing/SelfHealingEngine.js");
const CommandReporter_js_1 = require("../reporting/CommandReporter.js");
const CoalitionFederator_js_1 = require("../federation/CoalitionFederator.js");
const logger_js_1 = require("../utils/logger.js");
const metrics = __importStar(require("../utils/metrics.js"));
const DEFAULT_CONFIG = {
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    nodeId: process.env.NODE_ID ?? `node-${(0, uuid_1.v4)().slice(0, 8)}`,
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
class WorkflowOrchestrator extends eventemitter3_1.EventEmitter {
    config;
    redis;
    workflowQueue;
    taskQueue;
    worker;
    // Core components
    topologyManager;
    satelliteHandler;
    failoverController;
    healingEngine;
    commandReporter;
    coalitionFederator;
    // State tracking
    workflows = new Map();
    running = false;
    degraded = false;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        // Initialize Redis
        this.redis = new ioredis_1.default(this.config.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 100, 3000),
        });
        // Initialize queues
        this.workflowQueue = new bullmq_1.Queue('resilient-workflows', {
            connection: this.redis,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: 100,
                removeOnFail: 500,
            },
        });
        this.taskQueue = new bullmq_1.Queue('resilient-tasks', {
            connection: this.redis,
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 1000 },
            },
        });
        // Initialize components
        this.topologyManager = new NetworkTopologyManager_js_1.NetworkTopologyManager();
        this.satelliteHandler = new SatelliteCommHandler_js_1.SatelliteCommHandler();
        this.failoverController = new FailoverController_js_1.FailoverController(this.topologyManager, this.satelliteHandler);
        this.healingEngine = new SelfHealingEngine_js_1.SelfHealingEngine(this.topologyManager, this.failoverController);
        this.commandReporter = new CommandReporter_js_1.CommandReporter({
            port: this.config.reportingPort,
            satelliteHandler: this.satelliteHandler,
        });
        this.coalitionFederator = new CoalitionFederator_js_1.CoalitionFederator();
        this.setupEventHandlers();
    }
    setupEventHandlers() {
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
    async start() {
        if (this.running) {
            return;
        }
        logger_js_1.logger.info('Starting Workflow Orchestrator', { nodeId: this.config.nodeId });
        // Register this node in topology
        this.topologyManager.registerNode({
            name: this.config.nodeId,
            type: 'command',
            endpoints: [{
                    id: (0, uuid_1.v4)(),
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
        this.worker = new bullmq_1.Worker('resilient-tasks', async (job) => this.processTask(job), {
            connection: this.redis,
            concurrency: this.config.maxConcurrentTasks,
        });
        this.worker.on('failed', (job, error) => {
            if (job) {
                this.handleTaskFailure(job.data.taskId, error.message);
            }
        });
        this.running = true;
        logger_js_1.logger.info('Workflow Orchestrator started');
    }
    /**
     * Stop the orchestrator
     */
    async stop() {
        if (!this.running) {
            return;
        }
        logger_js_1.logger.info('Stopping Workflow Orchestrator');
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
        logger_js_1.logger.info('Workflow Orchestrator stopped');
    }
    /**
     * Submit a new workflow for execution
     */
    async submitWorkflow(workflow) {
        const fullWorkflow = {
            ...workflow,
            id: (0, uuid_1.v4)(),
            state: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            tasks: workflow.tasks.map(t => ({
                ...t,
                id: t.id || (0, uuid_1.v4)(),
                workflowId: '',
                state: 'pending',
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
        logger_js_1.logger.info('Workflow submitted', {
            workflowId: fullWorkflow.id,
            name: fullWorkflow.name,
            taskCount: fullWorkflow.tasks.length,
        });
        return fullWorkflow;
    }
    /**
     * Start workflow execution
     */
    async startWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        workflow.state = 'running';
        workflow.updatedAt = new Date();
        this.emit('workflow:started', workflow);
        // Report to command
        await this.commandReporter.sendStatusReport(this.config.nodeId, workflow.coalitionPartners ?? ['command'], workflow);
        // Queue ready tasks
        await this.queueReadyTasks(workflow);
    }
    /**
     * Pause a running workflow
     */
    async pauseWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return;
        }
        workflow.state = 'paused';
        workflow.updatedAt = new Date();
        // Create checkpoint
        this.healingEngine.createCheckpoint(workflow);
        this.emit('workflow:paused', workflow);
        logger_js_1.logger.info('Workflow paused', { workflowId });
    }
    /**
     * Resume a paused workflow
     */
    async resumeWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return;
        }
        workflow.state = 'running';
        workflow.updatedAt = new Date();
        await this.queueReadyTasks(workflow);
        logger_js_1.logger.info('Workflow resumed', { workflowId });
    }
    /**
     * Cancel a workflow
     */
    async cancelWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return;
        }
        workflow.state = 'cancelled';
        workflow.updatedAt = new Date();
        // Cancel pending tasks
        for (const task of workflow.tasks) {
            if (task.state === 'pending' || task.state === 'queued') {
                task.state = 'skipped';
            }
        }
        this.healingEngine.unregisterWorkflow(workflowId);
        logger_js_1.logger.info('Workflow cancelled', { workflowId });
    }
    /**
     * Get workflow status
     */
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    /**
     * Get all active workflows
     */
    getActiveWorkflows() {
        return Array.from(this.workflows.values()).filter(w => w.state === 'running' || w.state === 'paused' || w.state === 'healing');
    }
    /**
     * Delegate a task to coalition partners
     */
    async delegateTaskToCoalition(taskId, partnerIds) {
        for (const workflow of this.workflows.values()) {
            const task = workflow.tasks.find(t => t.id === taskId);
            if (task) {
                return this.coalitionFederator.delegateToMultiplePartners(task, partnerIds);
            }
        }
        return { delegated: [], failed: partnerIds };
    }
    async queueReadyTasks(workflow) {
        const readyTasks = workflow.tasks.filter(task => {
            if (task.state !== 'pending') {
                return false;
            }
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
    async processTask(job) {
        const { workflowId, taskId } = job.data;
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        const task = workflow.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
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
        }
        catch (error) {
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
    async executeTaskLogic(task) {
        // Simulate task execution
        // In production, this would dispatch to actual task handlers
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
        return {
            taskId: task.id,
            executedAt: new Date().toISOString(),
            status: 'success',
        };
    }
    async checkNetworkCondition(task) {
        if (!task.assignedNode) {
            return true;
        }
        const { healthySummary } = this.topologyManager.getTopologySnapshot();
        return healthySummary.healthy > 0 || healthySummary.degraded > 0;
    }
    async checkWorkflowCompletion(workflow) {
        const allDone = workflow.tasks.every(t => t.state === 'completed' || t.state === 'skipped' || t.state === 'failed');
        if (!allDone) {
            return;
        }
        const anyFailed = workflow.tasks.some(t => t.state === 'failed');
        if (anyFailed) {
            workflow.state = 'failed';
            this.emit('workflow:failed', workflow, 'One or more tasks failed');
            await this.commandReporter.sendFailureReport(this.config.nodeId, workflow.coalitionPartners ?? ['command'], workflow, workflow.tasks.find(t => t.state === 'failed'), 'Workflow failed');
        }
        else {
            workflow.state = 'completed';
            this.emit('workflow:completed', workflow);
            await this.commandReporter.sendCompletionReport(this.config.nodeId, workflow.coalitionPartners ?? ['command'], workflow, { tasksCompleted: workflow.tasks.length });
        }
        workflow.updatedAt = new Date();
        metrics.workflowsActive.dec({ state: 'running' });
        metrics.workflowsTotal.inc({ state: workflow.state, priority: workflow.priority });
    }
    handleTaskFailure(taskId, error) {
        for (const workflow of this.workflows.values()) {
            const task = workflow.tasks.find(t => t.id === taskId);
            if (task) {
                metrics.taskRetries.inc({ reason: this.categorizeError(error) });
                break;
            }
        }
    }
    handleTopologyDegraded(nodeIds) {
        this.degraded = true;
        this.emit('system:degraded', `Nodes degraded: ${nodeIds.join(', ')}`);
        // Send alert
        this.commandReporter.sendAlertReport(this.config.nodeId, ['command'], 'immediate', `Network topology degraded: ${nodeIds.length} nodes affected`, { affectedNodes: nodeIds });
    }
    handleTopologyRecovered(nodeIds) {
        const { healthySummary } = this.topologyManager.getTopologySnapshot();
        if (healthySummary.offline === 0 && healthySummary.degraded === 0) {
            this.degraded = false;
            this.emit('system:recovered');
        }
    }
    handleFailoverCompleted(event) {
        metrics.failoversTotal.inc({
            from_channel: event.fromChannel,
            to_channel: event.toChannel,
            reason: event.reason,
        });
        this.commandReporter.sendAlertReport(this.config.nodeId, ['command'], 'priority', `Failover completed: ${event.fromChannel} -> ${event.toChannel}`, event);
    }
    handleHealingCompleted(action) {
        metrics.healingActionsTotal.inc({
            strategy: action.strategy,
            success: action.success.toString(),
        });
        this.commandReporter.sendHealingReport(this.config.nodeId, ['command'], action);
    }
    handleFederatedTaskResult(taskId, partnerId, result) {
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
    getPriorityValue(priority) {
        const map = { critical: 1, high: 2, normal: 5, low: 10 };
        return map[priority] ?? 5;
    }
    categorizeError(message) {
        if (message.includes('network') || message.includes('timeout')) {
            return 'NETWORK_ERROR';
        }
        if (message.includes('unavailable')) {
            return 'NODE_UNAVAILABLE';
        }
        if (message.includes('connectivity')) {
            return 'NO_CONNECTIVITY';
        }
        return 'UNKNOWN';
    }
    isRecoverableError(message) {
        const unrecoverable = ['permission', 'invalid', 'not found', 'unauthorized'];
        return !unrecoverable.some(u => message.toLowerCase().includes(u));
    }
    /**
     * Get orchestrator statistics
     */
    getStats() {
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
    getTopologyManager() { return this.topologyManager; }
    getSatelliteHandler() { return this.satelliteHandler; }
    getFailoverController() { return this.failoverController; }
    getHealingEngine() { return this.healingEngine; }
    getCommandReporter() { return this.commandReporter; }
    getCoalitionFederator() { return this.coalitionFederator; }
}
exports.WorkflowOrchestrator = WorkflowOrchestrator;
