"use strict";
/**
 * Mesh Orchestrator Service
 *
 * Central coordination service for the Agentic Mesh.
 * Receives top-level tasks and orchestrates their execution through the mesh.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultOrchestratorConfig = exports.MeshOrchestrator = void 0;
// ============================================================================
// ORCHESTRATOR
// ============================================================================
class MeshOrchestrator {
    tasks = new Map();
    taskQueue;
    agents = new Map();
    flowEngine;
    constructor(config) {
        this.taskQueue = new PriorityQueue();
        this.flowEngine = new FlowEngine(config.flows);
    }
    /**
     * Submit a new task to the mesh.
     */
    async submitTask(submission) {
        const taskId = crypto.randomUUID();
        const now = new Date().toISOString();
        const task = {
            id: taskId,
            type: submission.type,
            input: submission.input,
            priority: submission.priority ?? 0,
            metadata: submission.metadata ?? {},
            createdAt: now,
            updatedAt: now,
            status: 'pending',
            subtasks: [],
            attempts: [],
        };
        this.tasks.set(taskId, task);
        this.taskQueue.enqueue(taskId, task.priority);
        // Start processing
        this.processTask(taskId).catch((err) => {
            console.error(`Task ${taskId} processing failed:`, err);
        });
        return {
            taskId,
            estimatedCompletion: submission.deadline,
        };
    }
    /**
     * Get task status and details.
     */
    async getTask(taskId) {
        return this.tasks.get(taskId) ?? null;
    }
    /**
     * Cancel a running task.
     */
    async cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        if (task.status === 'running' || task.status === 'pending') {
            task.status = 'cancelled';
            task.updatedAt = new Date().toISOString();
            return true;
        }
        return false;
    }
    /**
     * Retry a failed task.
     */
    async retryTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'failed')
            return false;
        task.status = 'pending';
        task.updatedAt = new Date().toISOString();
        this.taskQueue.enqueue(taskId, task.priority);
        this.processTask(taskId);
        return true;
    }
    /**
     * Register an agent with the orchestrator.
     */
    registerAgent(agent) {
        this.agents.set(agent.id, agent);
    }
    /**
     * Unregister an agent.
     */
    unregisterAgent(agentId) {
        this.agents.delete(agentId);
    }
    // ---------------------------------------------------------------------------
    // PRIVATE METHODS
    // ---------------------------------------------------------------------------
    async processTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        try {
            // 1. Determine the flow for this task type
            const flow = this.flowEngine.getFlow(task.type);
            // 2. Execute the flow
            task.status = 'running';
            task.updatedAt = new Date().toISOString();
            const result = await this.flowEngine.execute(flow, task, {
                routeTask: this.routeTask.bind(this),
                evaluatePolicy: this.evaluatePolicy.bind(this),
                invokeAgent: this.invokeAgent.bind(this),
                spawnSubtask: this.spawnSubtask.bind(this),
            });
            // 3. Update task with result
            task.status = result.status === 'completed' ? 'completed' : 'failed';
            task.result = result;
            task.completedAt = new Date().toISOString();
            task.updatedAt = task.completedAt;
        }
        catch (error) {
            task.status = 'failed';
            task.updatedAt = new Date().toISOString();
            task.result = {
                taskId,
                status: 'failed',
                error: {
                    code: 'ORCHESTRATION_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    recoverable: true,
                },
                metadata: {
                    tokensUsed: 0,
                    costUsd: 0,
                    latencyMs: 0,
                    modelCallCount: 0,
                    toolCallCount: 0,
                    provenanceRecordIds: [],
                },
            };
        }
    }
    async routeTask(task) {
        // In production, would call the routing-gateway service
        const availableAgents = Array.from(this.agents.values()).filter((a) => a.status === 'active' && a.capabilities.some((c) => task.type.includes(c)));
        if (availableAgents.length === 0) {
            throw new Error('No available agents for task type: ' + task.type);
        }
        const selected = availableAgents[0];
        return {
            selectedAgent: selected.id,
            selectedModel: selected.modelPreference ?? { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
            strategy: 'cheapest_meeting_slo',
            confidence: 0.9,
            alternatives: [],
            decidedAt: new Date().toISOString(),
        };
    }
    async evaluatePolicy(context) {
        // In production, would call the policy-enforcer service
        return {
            action: 'allow',
            reason: 'Default allow',
            auditRequired: true,
            decisionId: crypto.randomUUID(),
            evaluatedAt: new Date().toISOString(),
        };
    }
    async invokeAgent(agentId, task) {
        // In production, would send task to the agent via message queue
        return {
            taskId: task.id,
            status: 'completed',
            result: { message: 'Agent invoked successfully' },
            metadata: {
                tokensUsed: 100,
                costUsd: 0.001,
                latencyMs: 500,
                modelCallCount: 1,
                toolCallCount: 0,
                provenanceRecordIds: [],
            },
        };
    }
    async spawnSubtask(parentTaskId, submission) {
        const result = await this.submitTask({
            ...submission,
            metadata: {
                ...submission.metadata,
                parentTaskId,
            },
        });
        const parentTask = this.tasks.get(parentTaskId);
        if (parentTask) {
            parentTask.subtasks.push(result.taskId);
        }
        return result.taskId;
    }
}
exports.MeshOrchestrator = MeshOrchestrator;
class FlowEngine {
    flows = new Map();
    constructor(flows) {
        for (const flow of flows) {
            for (const taskType of flow.taskTypes) {
                this.flows.set(taskType, flow);
            }
        }
    }
    getFlow(taskType) {
        // Try exact match
        let flow = this.flows.get(taskType);
        // Try prefix match
        if (!flow) {
            for (const [type, f] of this.flows) {
                if (taskType.startsWith(type) || type === '*') {
                    flow = f;
                    break;
                }
            }
        }
        // Default flow
        if (!flow) {
            flow = defaultFlow;
        }
        return flow;
    }
    async execute(flow, task, context) {
        let currentStep = flow.steps[0];
        let retries = 0;
        while (currentStep) {
            try {
                const result = await this.executeStep(currentStep, task, context);
                if (result.success) {
                    // Find next step
                    const nextStepName = currentStep.onSuccess;
                    if (!nextStepName) {
                        return result.output;
                    }
                    currentStep = flow.steps.find((s) => s.name === nextStepName);
                }
                else {
                    // Handle failure
                    if (retries < flow.errorHandling.maxRetries) {
                        retries++;
                        await sleep(flow.errorHandling.retryDelayMs);
                        continue;
                    }
                    // Go to failure step or return error
                    const failureStepName = currentStep.onFailure;
                    if (failureStepName) {
                        currentStep = flow.steps.find((s) => s.name === failureStepName);
                    }
                    else {
                        return {
                            taskId: task.id,
                            status: 'failed',
                            error: {
                                code: 'FLOW_STEP_FAILED',
                                message: `Step ${currentStep.name} failed after ${retries} retries`,
                                recoverable: true,
                            },
                            metadata: {
                                tokensUsed: 0,
                                costUsd: 0,
                                latencyMs: 0,
                                modelCallCount: 0,
                                toolCallCount: 0,
                                provenanceRecordIds: [],
                            },
                        };
                    }
                }
            }
            catch (error) {
                if (retries < flow.errorHandling.maxRetries) {
                    retries++;
                    await sleep(flow.errorHandling.retryDelayMs);
                }
                else {
                    throw error;
                }
            }
        }
        return {
            taskId: task.id,
            status: 'completed',
            metadata: {
                tokensUsed: 0,
                costUsd: 0,
                latencyMs: 0,
                modelCallCount: 0,
                toolCallCount: 0,
                provenanceRecordIds: [],
            },
        };
    }
    async executeStep(step, task, context) {
        switch (step.type) {
            case 'route': {
                const decision = await context.routeTask(task);
                task.routingDecision = decision;
                task.assignedAgent = decision.selectedAgent;
                return { success: true };
            }
            case 'policy_check': {
                const policyContext = {
                    action: 'task_assign',
                    subject: { type: 'agent', id: task.assignedAgent ?? '', roles: [], attributes: {} },
                    resource: { type: task.type, id: task.id, classification: 'internal', attributes: {} },
                    environment: { timestamp: new Date().toISOString(), requestId: task.id },
                };
                const decision = await context.evaluatePolicy(policyContext);
                task.policyDecision = decision;
                if (decision.action === 'deny') {
                    return {
                        success: false,
                        output: {
                            taskId: task.id,
                            status: 'failed',
                            error: { code: 'POLICY_DENIED', message: decision.reason, recoverable: false },
                            metadata: { tokensUsed: 0, costUsd: 0, latencyMs: 0, modelCallCount: 0, toolCallCount: 0, provenanceRecordIds: [] },
                        },
                    };
                }
                return { success: decision.action !== 'deny' };
            }
            case 'agent_invoke': {
                if (!task.assignedAgent) {
                    return { success: false };
                }
                const output = await context.invokeAgent(task.assignedAgent, task);
                return { success: output.status === 'completed', output };
            }
            case 'critic_review': {
                // Spawn critic subtask
                const criticTaskId = await context.spawnSubtask(task.id, {
                    type: 'critic_review',
                    input: { content: task.result?.result, contentType: task.type },
                    priority: task.priority,
                });
                // Wait for critic (simplified)
                return { success: true };
            }
            default:
                return { success: true };
        }
    }
}
// ============================================================================
// UTILITIES
// ============================================================================
class PriorityQueue {
    items = [];
    enqueue(value, priority) {
        this.items.push({ value, priority });
        this.items.sort((a, b) => b.priority - a.priority);
    }
    dequeue() {
        return this.items.shift()?.value;
    }
    peek() {
        return this.items[0]?.value;
    }
    isEmpty() {
        return this.items.length === 0;
    }
    size() {
        return this.items.length;
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
const defaultFlow = {
    name: 'default',
    taskTypes: ['*'],
    steps: [
        { name: 'route', type: 'route', config: {}, onSuccess: 'policy_check' },
        { name: 'policy_check', type: 'policy_check', config: {}, onSuccess: 'invoke' },
        { name: 'invoke', type: 'agent_invoke', config: {} },
    ],
    errorHandling: {
        maxRetries: 3,
        retryDelayMs: 1000,
    },
};
exports.defaultOrchestratorConfig = {
    flows: [
        defaultFlow,
        {
            name: 'code_flow',
            taskTypes: ['code_generate', 'code_refactor', 'code_review'],
            steps: [
                { name: 'route', type: 'route', config: {}, onSuccess: 'policy_check' },
                { name: 'policy_check', type: 'policy_check', config: {}, onSuccess: 'invoke' },
                { name: 'invoke', type: 'agent_invoke', config: {}, onSuccess: 'critic' },
                { name: 'critic', type: 'critic_review', config: {} },
            ],
            errorHandling: {
                maxRetries: 2,
                retryDelayMs: 2000,
            },
        },
    ],
    maxConcurrentTasks: 100,
    defaultTimeout: 300000, // 5 minutes
};
