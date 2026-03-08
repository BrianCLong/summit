"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskOrchestrator = void 0;
const governance_kernel_1 = require("@intelgraph/governance-kernel");
const crypto_1 = require("crypto");
class TaskOrchestrator {
    eventBus;
    graphAdapter;
    tasks = new Map();
    runners = [];
    constructor(eventBus, graphAdapter // Integration with IntelGraph
    ) {
        this.eventBus = eventBus;
        this.graphAdapter = graphAdapter;
    }
    registerRunner(runner) {
        this.runners.push(runner);
    }
    async createTask(tenantId, type, input, riskCategory) {
        // 1. Governance Check PRE-CREATION or immediately upon creation
        const govDecision = (0, governance_kernel_1.evaluateGovernancePolicy)(riskCategory, {
            tenantId,
            action: 'CREATE_TASK',
            resource: type,
            params: input
        });
        const task = {
            id: (0, crypto_1.randomUUID)(),
            tenantId,
            type,
            input,
            status: 'PENDING',
            riskCategory,
            createdAt: new Date(),
            updatedAt: new Date(),
            governanceDecision: govDecision
        };
        if (govDecision.outcome === 'DENIED') {
            task.status = 'BLOCKED_BY_GOVERNANCE';
            // Record in graph
            await this.graphAdapter.addNode({
                id: govDecision.id,
                label: 'GovernanceDecision',
                properties: { ...govDecision }
            });
            // Emit blocked event
            this.eventBus.emit({ type: 'TASK_BLOCKED', task, timestamp: new Date() });
        }
        else {
            // Allowed or Conditional
            this.tasks.set(task.id, task);
            // Record task in graph
            await this.graphAdapter.addNode({
                id: task.id,
                label: 'Task',
                properties: { type: task.type, status: task.status, tenantId }
            });
            await this.graphAdapter.addEdge({
                id: (0, crypto_1.randomUUID)(),
                from: task.id,
                to: tenantId,
                type: 'TASK_OF_TENANT'
            });
            this.eventBus.emit({ type: 'TASK_CREATED', task, timestamp: new Date() });
            // Auto-dispatch if allowed
            await this.dispatch(task.id);
        }
        return task;
    }
    async dispatch(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'PENDING')
            return;
        const runner = this.runners.find((r) => r.canHandle(task.type));
        if (!runner) {
            console.warn(`No runner found for task type ${task.type}`);
            return;
        }
        task.status = 'RUNNING';
        task.updatedAt = new Date();
        this.eventBus.emit({ type: 'TASK_STARTED', task, timestamp: new Date() });
        try {
            const result = await runner.execute(task);
            task.status = 'COMPLETED';
            task.result = result;
            this.eventBus.emit({ type: 'TASK_COMPLETED', task, timestamp: new Date() });
            // Update graph
            // In a real DB, we'd update. Here in memory/append-only, maybe we just assume update or add a new node version?
            // Simple update logic for the mock adapter would be to re-add.
            // But let's add an event edge.
            await this.graphAdapter.addEdge({
                id: (0, crypto_1.randomUUID)(),
                from: task.id,
                to: task.id, // self-loop or pointing to a "CompletionEvent"? Let's just update the Task node props in memory if supported.
                type: 'LINKED_EVENT',
                properties: { event: 'COMPLETED' }
            });
        }
        catch (err) {
            task.status = 'FAILED';
            this.eventBus.emit({ type: 'TASK_FAILED', task, timestamp: new Date(), payload: err });
        }
        task.updatedAt = new Date();
    }
    getTask(id) {
        return this.tasks.get(id);
    }
}
exports.TaskOrchestrator = TaskOrchestrator;
