"use strict";
// @ts-nocheck
// server/src/conductor/workflows/workflow-executor.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowExecutor = exports.WorkflowExecutor = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const emitter_js_1 = require("../../metering/emitter.js");
class WorkflowExecutor extends events_1.EventEmitter {
    workflowsPath;
    redisUrl;
    redis;
    workflows = new Map();
    activeExecutions = new Map();
    scheduleIntervals = new Map();
    constructor(workflowsPath = '/Users/brianlong/Documents/GitHub/intelgraph/workflows', redisUrl = process.env.REDIS_URL ||
        'redis://localhost:6379') {
        super();
        this.workflowsPath = workflowsPath;
        this.redisUrl = redisUrl;
        this.redis = new ioredis_1.default(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
    }
    /**
     * Initialize workflow executor
     */
    async initialize() {
        try {
            await this.redis.connect();
            await this.loadWorkflowDefinitions();
            await this.restoreActiveExecutions();
            await this.setupScheduledTriggers();
            logger_js_1.default.info('🎭 Workflow executor initialized', {
                workflowCount: this.workflows.size,
                activeExecutions: this.activeExecutions.size,
                scheduledWorkflows: this.scheduleIntervals.size,
            });
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to initialize workflow executor', {
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Load workflow definitions from filesystem
     */
    async loadWorkflowDefinitions() {
        try {
            const workflowFiles = await this.findWorkflowFiles(this.workflowsPath);
            for (const filePath of workflowFiles) {
                try {
                    const content = await fs_1.promises.readFile(filePath, 'utf8');
                    const workflow = js_yaml_1.default.load(content);
                    this.workflows.set(workflow.name, workflow);
                    logger_js_1.default.debug('📄 Loaded workflow definition', {
                        name: workflow.name,
                        version: workflow.version,
                        taskCount: workflow.tasks.length,
                    });
                }
                catch (error) {
                    logger_js_1.default.error('❌ Failed to load workflow file', {
                        file: filePath,
                        error: error.message,
                    });
                }
            }
            logger_js_1.default.info('📚 Workflow definitions loaded', {
                count: this.workflows.size,
                workflows: Array.from(this.workflows.keys()),
            });
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to load workflow definitions', {
                error: error.message,
            });
            throw error;
        }
    }
    /**
     * Find all workflow YAML files recursively
     */
    async findWorkflowFiles(dir) {
        const files = [];
        try {
            const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findWorkflowFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (entry.name.endsWith('.yaml') ||
                    entry.name.endsWith('.yml')) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Directory might not exist, that's ok
            logger_js_1.default.debug('📁 Directory not found or inaccessible', {
                dir,
                error: error.message,
            });
        }
        return files;
    }
    /**
     * Execute workflow by name
     */
    async executeWorkflow(workflowName, triggeredBy, variables = {}, metadata = {
        user_id: 'system',
        tenant_id: 'default',
    }) {
        const workflow = this.workflows.get(workflowName);
        if (!workflow) {
            throw new Error(`Workflow '${workflowName}' not found`);
        }
        const executionId = (0, crypto_1.randomUUID)();
        const execution = {
            id: executionId,
            workflow_name: workflowName,
            status: 'pending',
            triggered_by: triggeredBy,
            triggered_at: new Date(),
            current_task: undefined,
            completed_tasks: [],
            failed_tasks: [],
            task_outputs: {},
            variables: { ...workflow.variables, ...variables },
            metadata,
        };
        this.activeExecutions.set(executionId, execution);
        await this.persistExecution(execution);
        // Start execution asynchronously
        setImmediate(() => this.runWorkflowExecution(executionId));
        logger_js_1.default.info('🚀 Workflow execution started', {
            executionId,
            workflowName,
            triggeredBy,
            userId: metadata.user_id,
        });
        return executionId;
    }
    /**
     * Get workflow execution status
     */
    async getExecutionStatus(executionId) {
        let execution = this.activeExecutions.get(executionId);
        if (!execution) {
            // Try to load from Redis
            execution = await this.loadExecution(executionId);
        }
        return execution || null;
    }
    /**
     * List all workflow executions with filtering
     */
    async listExecutions(filters = {}) {
        const executionIds = await this.redis.zrevrange('workflow:executions', 0, -1);
        const executions = [];
        let total = 0;
        for (const executionId of executionIds) {
            const execution = await this.loadExecution(executionId);
            if (!execution)
                continue;
            // Apply filters
            if (filters.workflow_name &&
                execution.workflow_name !== filters.workflow_name)
                continue;
            if (filters.status && execution.status !== filters.status)
                continue;
            if (filters.user_id && execution.metadata.user_id !== filters.user_id)
                continue;
            if (filters.tenant_id &&
                execution.metadata.tenant_id !== filters.tenant_id)
                continue;
            total++;
            // Apply pagination
            if (filters.offset && total <= filters.offset)
                continue;
            if (filters.limit && executions.length >= filters.limit)
                break;
            executions.push(execution);
        }
        return { executions, total };
    }
    /**
     * Cancel workflow execution
     */
    async cancelExecution(executionId) {
        const execution = this.activeExecutions.get(executionId) ||
            (await this.loadExecution(executionId));
        if (!execution) {
            throw new Error(`Execution '${executionId}' not found`);
        }
        if (execution.status === 'completed' || execution.status === 'failed') {
            throw new Error(`Cannot cancel execution in status '${execution.status}'`);
        }
        execution.status = 'cancelled';
        execution.completed_at = new Date();
        execution.duration_ms = execution.started_at
            ? execution.completed_at.getTime() - execution.started_at.getTime()
            : 0;
        this.activeExecutions.set(executionId, execution);
        await this.persistExecution(execution);
        this.emit('execution:cancelled', execution);
        logger_js_1.default.info('🛑 Workflow execution cancelled', {
            executionId,
            workflowName: execution.workflow_name,
        });
    }
    /**
     * Get available workflows
     */
    getAvailableWorkflows() {
        return Array.from(this.workflows.values()).map((workflow) => ({
            name: workflow.name,
            version: workflow.version,
            description: workflow.description,
            tags: workflow.metadata.tags,
            triggers: workflow.triggers.map((t) => t.type),
        }));
    }
    /**
     * Run workflow execution
     */
    async runWorkflowExecution(executionId) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            logger_js_1.default.error('❌ Execution not found', { executionId });
            return;
        }
        const workflow = this.workflows.get(execution.workflow_name);
        if (!workflow) {
            logger_js_1.default.error('❌ Workflow definition not found', {
                workflowName: execution.workflow_name,
                executionId,
            });
            return;
        }
        try {
            execution.status = 'running';
            execution.started_at = new Date();
            await this.persistExecution(execution);
            this.emit('execution:started', execution);
            // Execute tasks based on dependency graph
            await this.executeTasksInOrder(execution, workflow);
            // Check success criteria
            const success = await this.evaluateSuccessCriteria(execution, workflow);
            execution.status = success ? 'completed' : 'failed';
            execution.completed_at = new Date();
            execution.duration_ms =
                execution.completed_at.getTime() - execution.started_at.getTime();
            await this.persistExecution(execution);
            if (success && workflow.on_success) {
                await this.executeSuccessActions(execution, workflow);
            }
            else if (!success && workflow.on_failure) {
                await this.executeFailureActions(execution, workflow);
            }
            this.emit(success ? 'execution:completed' : 'execution:failed', execution);
            logger_js_1.default.info(`${success ? '✅' : '❌'} Workflow execution ${success ? 'completed' : 'failed'}`, {
                executionId,
                workflowName: execution.workflow_name,
                duration: execution.duration_ms,
                completedTasks: execution.completed_tasks.length,
                failedTasks: execution.failed_tasks.length,
            });
            // Metering: Record workflow execution
            try {
                await emitter_js_1.meteringEmitter.emitWorkflowExecution({
                    tenantId: execution.metadata.tenant_id,
                    workflowName: execution.workflow_name,
                    stepsCount: execution.completed_tasks.length + execution.failed_tasks.length,
                    source: 'WorkflowExecutor',
                    correlationId: executionId,
                    metadata: {
                        status: execution.status,
                        durationMs: execution.duration_ms,
                    },
                });
            }
            catch (err) {
                logger_js_1.default.warn({ err }, 'Failed to emit workflow execution meter event');
            }
        }
        catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.completed_at = new Date();
            execution.duration_ms = execution.started_at
                ? execution.completed_at.getTime() - execution.started_at.getTime()
                : 0;
            await this.persistExecution(execution);
            this.emit('execution:failed', execution);
            logger_js_1.default.error('❌ Workflow execution failed', {
                executionId,
                workflowName: execution.workflow_name,
                error: error.message,
            });
        }
        finally {
            // Clean up from active executions after some delay
            setTimeout(() => {
                this.activeExecutions.delete(executionId);
            }, 60000); // 1 minute
        }
    }
    /**
     * Execute tasks in dependency order
     */
    async executeTasksInOrder(execution, workflow) {
        const taskDependencies = this.buildDependencyGraph(workflow.tasks);
        const executionOrder = this.topologicalSort(taskDependencies);
        for (const taskName of executionOrder) {
            if (execution.status === 'cancelled') {
                break;
            }
            const task = workflow.tasks.find((t) => t.name === taskName);
            if (!task)
                continue;
            // Check if dependencies are satisfied
            const dependenciesSatisfied = (task.depends_on || []).every((dep) => execution.completed_tasks.includes(dep));
            if (!dependenciesSatisfied) {
                logger_js_1.default.warn('⚠️ Task dependencies not satisfied, skipping', {
                    task: taskName,
                    dependencies: task.depends_on,
                    completedTasks: execution.completed_tasks,
                });
                continue;
            }
            execution.current_task = taskName;
            await this.persistExecution(execution);
            const success = await this.executeTask(execution, task, workflow);
            if (success) {
                execution.completed_tasks.push(taskName);
            }
            else {
                execution.failed_tasks.push(taskName);
                // Stop execution on task failure unless configured otherwise
                break;
            }
        }
    }
    /**
     * Execute individual task (mock implementation for now)
     */
    async executeTask(execution, task, workflow) {
        const taskExecution = {
            id: (0, crypto_1.randomUUID)(),
            workflow_execution_id: execution.id,
            task_name: task.name,
            status: 'running',
            started_at: new Date(),
            outputs: {},
            retry_count: 0,
        };
        try {
            logger_js_1.default.info('▶️ Executing task', {
                task: task.name,
                type: task.type,
                executionId: execution.id,
            });
            // Mock task execution based on type
            const outputs = await this.mockTaskExecution(task, execution.variables);
            taskExecution.status = 'completed';
            taskExecution.completed_at = new Date();
            taskExecution.duration_ms =
                taskExecution.completed_at.getTime() -
                    taskExecution.started_at.getTime();
            taskExecution.outputs = outputs;
            execution.task_outputs[task.name] = outputs;
            logger_js_1.default.info('✅ Task completed', {
                task: task.name,
                duration: taskExecution.duration_ms,
                outputKeys: Object.keys(outputs),
            });
            return true;
        }
        catch (error) {
            taskExecution.status = 'failed';
            taskExecution.completed_at = new Date();
            taskExecution.duration_ms = taskExecution.started_at
                ? taskExecution.completed_at.getTime() -
                    taskExecution.started_at.getTime()
                : 0;
            taskExecution.error = error.message;
            logger_js_1.default.error('❌ Task failed', {
                task: task.name,
                error: error.message,
                executionId: execution.id,
            });
            return false;
        }
    }
    /**
     * Mock task execution (replace with real implementations)
     */
    async mockTaskExecution(task, variables) {
        // Simulate task execution time
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));
        const outputs = {};
        switch (task.type) {
            case 'http_request':
                outputs.status_code = 200;
                outputs.response_time = Math.random() * 1000 + 100;
                outputs.success = true;
                break;
            case 'database_query':
                outputs.rows_affected = Math.floor(Math.random() * 10) + 1;
                outputs.query_time = Math.random() * 500 + 50;
                break;
            case 'web_orchestration':
                outputs.intelligence_report = `Intelligence analysis for ${variables.analysis_target || 'target'}`;
                outputs.confidence_score = 0.8 + Math.random() * 0.2;
                outputs.sources_used = Math.floor(Math.random() * 5) + 3;
                break;
            default:
                outputs.result = 'success';
                outputs.execution_time = Math.random() * 2000 + 100;
        }
        return outputs;
    }
    /**
     * Build task dependency graph
     */
    buildDependencyGraph(tasks) {
        const graph = new Map();
        for (const task of tasks) {
            graph.set(task.name, task.depends_on || []);
        }
        return graph;
    }
    /**
     * Topological sort for task execution order
     */
    topologicalSort(dependencies) {
        const visited = new Set();
        const visiting = new Set();
        const result = [];
        const visit = (node) => {
            if (visiting.has(node)) {
                throw new Error(`Circular dependency detected involving task: ${node}`);
            }
            if (visited.has(node)) {
                return;
            }
            visiting.add(node);
            const deps = dependencies.get(node) || [];
            for (const dep of deps) {
                visit(dep);
            }
            visiting.delete(node);
            visited.add(node);
            result.push(node);
        };
        for (const node of dependencies.keys()) {
            if (!visited.has(node)) {
                visit(node);
            }
        }
        return result;
    }
    /**
     * Evaluate workflow success criteria
     */
    async evaluateSuccessCriteria(execution, workflow) {
        if (!workflow.success_criteria) {
            return execution.failed_tasks.length === 0;
        }
        // For now, return true if no tasks failed
        // In a real implementation, you'd evaluate the conditions
        return execution.failed_tasks.length === 0;
    }
    /**
     * Execute success actions
     */
    async executeSuccessActions(execution, workflow) {
        if (!workflow.on_success)
            return;
        for (const action of workflow.on_success) {
            try {
                logger_js_1.default.info('📊 Executing success action', {
                    type: action.type,
                    executionId: execution.id,
                });
                // Implement success actions (metrics, notifications, etc.)
            }
            catch (error) {
                logger_js_1.default.error('❌ Success action failed', {
                    type: action.type,
                    error: error.message,
                    executionId: execution.id,
                });
            }
        }
    }
    /**
     * Execute failure actions
     */
    async executeFailureActions(execution, workflow) {
        if (!workflow.on_failure)
            return;
        for (const action of workflow.on_failure) {
            try {
                logger_js_1.default.info('🚨 Executing failure action', {
                    type: action.type,
                    executionId: execution.id,
                });
                // Implement failure actions (alerts, cleanup, etc.)
            }
            catch (error) {
                logger_js_1.default.error('❌ Failure action failed', {
                    type: action.type,
                    error: error.message,
                    executionId: execution.id,
                });
            }
        }
    }
    /**
     * Setup scheduled triggers for workflows
     */
    async setupScheduledTriggers() {
        for (const [workflowName, workflow] of this.workflows.entries()) {
            for (const trigger of workflow.triggers) {
                if (trigger.type === 'schedule' && trigger.enabled && trigger.cron) {
                    // For simplicity, using setTimeout instead of proper cron
                    // In production, use node-cron or similar
                    const intervalMs = this.parseCronToInterval(trigger.cron);
                    if (intervalMs > 0) {
                        const interval = setInterval(async () => {
                            try {
                                await this.executeWorkflow(workflowName, 'schedule');
                            }
                            catch (error) {
                                logger_js_1.default.error('❌ Scheduled workflow execution failed', {
                                    workflow: workflowName,
                                    error: error.message,
                                });
                            }
                        }, intervalMs);
                        this.scheduleIntervals.set(`${workflowName}:${trigger.cron}`, interval);
                    }
                }
            }
        }
        logger_js_1.default.info('⏰ Scheduled triggers configured', {
            scheduleCount: this.scheduleIntervals.size,
        });
    }
    /**
     * Parse cron expression to interval (simplified)
     */
    parseCronToInterval(cron) {
        // Simplified parsing - in production use proper cron library
        if (cron === '*/5 * * * *')
            return 5 * 60 * 1000; // Every 5 minutes
        if (cron === '0 */6 * * *')
            return 6 * 60 * 60 * 1000; // Every 6 hours
        return 0;
    }
    /**
     * Persist execution to Redis
     */
    async persistExecution(execution) {
        const key = `workflow:execution:${execution.id}`;
        const data = JSON.stringify(execution);
        await Promise.all([
            this.redis.setex(key, 7 * 24 * 60 * 60, data), // 7 days TTL
            this.redis.zadd('workflow:executions', Date.now(), execution.id),
        ]);
    }
    /**
     * Load execution from Redis
     */
    async loadExecution(executionId) {
        const key = `workflow:execution:${executionId}`;
        const data = await this.redis.get(key);
        if (!data)
            return null;
        try {
            const execution = JSON.parse(data);
            // Convert date strings back to Date objects
            execution.triggered_at = new Date(execution.triggered_at);
            if (execution.started_at)
                execution.started_at = new Date(execution.started_at);
            if (execution.completed_at)
                execution.completed_at = new Date(execution.completed_at);
            return execution;
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to parse execution data', {
                executionId,
                error: error.message,
            });
            return null;
        }
    }
    /**
     * Restore active executions from Redis
     */
    async restoreActiveExecutions() {
        const executionIds = await this.redis.zrevrange('workflow:executions', 0, 99); // Get latest 100
        let restoredCount = 0;
        for (const executionId of executionIds) {
            const execution = await this.loadExecution(executionId);
            if (execution &&
                (execution.status === 'pending' || execution.status === 'running')) {
                this.activeExecutions.set(executionId, execution);
                restoredCount++;
                // Resume execution if it was running
                if (execution.status === 'running') {
                    setImmediate(() => this.runWorkflowExecution(executionId));
                }
            }
        }
        logger_js_1.default.info('🔄 Active executions restored', { count: restoredCount });
    }
    /**
     * Shutdown workflow executor
     */
    async shutdown() {
        // Clear all scheduled intervals
        for (const interval of this.scheduleIntervals.values()) {
            clearInterval(interval);
        }
        this.scheduleIntervals.clear();
        // Wait for active executions to complete or cancel them
        const activeIds = Array.from(this.activeExecutions.keys());
        for (const executionId of activeIds) {
            try {
                await this.cancelExecution(executionId);
            }
            catch (error) {
                logger_js_1.default.warn('⚠️ Failed to cancel execution during shutdown', {
                    executionId,
                    error: error.message,
                });
            }
        }
        await this.redis.quit();
        logger_js_1.default.info('🎭 Workflow executor shut down');
    }
}
exports.WorkflowExecutor = WorkflowExecutor;
exports.workflowExecutor = new WorkflowExecutor();
