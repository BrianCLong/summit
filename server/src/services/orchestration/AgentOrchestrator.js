"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const AgentLifecycleManager_js_1 = require("./AgentLifecycleManager.js");
const TaskRouter_js_1 = require("./TaskRouter.js");
const ConsensusManager_js_1 = require("./ConsensusManager.js");
const PolicyEngine_js_1 = require("../governance/PolicyEngine.js");
const persistence_js_1 = require("./persistence.js");
const IntelGraphIntegration_js_1 = require("./IntelGraphIntegration.js");
const telemetry_js_1 = require("./telemetry.js");
const events_1 = require("events");
const crypto_1 = require("crypto");
class AgentOrchestrator extends events_1.EventEmitter {
    static instance;
    lifecycleManager;
    taskRouter;
    consensusManager;
    policyEngine;
    persistence;
    intelGraph;
    processInterval;
    constructor() {
        super();
        this.lifecycleManager = AgentLifecycleManager_js_1.AgentLifecycleManager.getInstance();
        this.taskRouter = TaskRouter_js_1.TaskRouter.getInstance();
        this.consensusManager = ConsensusManager_js_1.ConsensusManager.getInstance();
        this.policyEngine = PolicyEngine_js_1.PolicyEngine.getInstance();
        this.persistence = new persistence_js_1.InMemoryPersistence(); // Default to InMemory
        this.intelGraph = IntelGraphIntegration_js_1.IntelGraphIntegration.getInstance();
        // Periodically process queue
        this.processInterval = setInterval(() => this.processQueue(), 5000);
    }
    shutdown() {
        if (this.processInterval) {
            clearInterval(this.processInterval);
        }
    }
    static getInstance() {
        if (!AgentOrchestrator.instance) {
            AgentOrchestrator.instance = new AgentOrchestrator();
        }
        return AgentOrchestrator.instance;
    }
    /**
     * Submits a high-level task to the orchestration layer.
     */
    async submitTask(taskDef) {
        return (0, telemetry_js_1.traceTask)('submitTask', async () => {
            // 1. Policy Check
            const policyResult = await this.policyEngine.evaluate('submit_task', {
                user: taskDef.metadata?.user,
                resource: taskDef
            });
            if (!policyResult.allowed) {
                throw new Error(`Task submission denied: ${policyResult.reason}`);
            }
            // 2. Create Task
            const task = {
                ...taskDef,
                id: (0, crypto_1.randomUUID)(),
                status: 'pending',
                createdAt: new Date(),
                dependencies: []
            };
            await this.persistence.saveTask(task);
            // 3. Decompose (if needed) - Stub for now
            // In a real system, we'd use an LLM here to break down the task
            // const subtasks = await this.decomposeTask(task);
            // this.taskQueue.push(...subtasks);
            logger_js_1.default.info(`Task submitted: ${task.id}`);
            return task.id;
        });
    }
    async processQueue() {
        return (0, telemetry_js_1.traceTask)('processQueue', async () => {
            const pendingTasks = await this.persistence.getPendingTasks();
            if (pendingTasks.length === 0)
                return;
            for (const task of pendingTasks) {
                // Check dependencies
                if (!this.checkDependencies(task)) {
                    continue;
                }
                // Route
                const agentId = this.taskRouter.routeTask(task);
                if (agentId) {
                    // Assign
                    await this.persistence.updateTaskStatus(task.id, 'assigned', agentId);
                    this.lifecycleManager.updateStatus(agentId, 'busy');
                    // Notify Agent (simulation)
                    // In reality, this would send a message via message bus
                    this.emit('task_assigned', { taskId: task.id, agentId });
                    logger_js_1.default.info(`Task ${task.id} assigned to ${agentId}`);
                    // Log to IntelGraph
                    const agent = this.lifecycleManager.getAgent(agentId);
                    if (agent) {
                        await this.intelGraph.logAgentDecision(agent, task, 'ASSIGNED', 'Best match by capability score');
                    }
                }
                else {
                    // No agent available
                    // logger.debug(`No agent available for task ${task.id}`);
                }
            }
        });
    }
    checkDependencies(task) {
        if (task.dependencies.length === 0)
            return true;
        // Check if all dependent tasks are complete
        // This requires looking up tasks which we don't store persistently in this class yet
        // Assuming dependencies are satisfied for this prototype or implemented with a lookup
        return true;
    }
    async broadcastMessage(message) {
        // Basic message bus
        this.emit('message', message);
        // If targeted
        if (message.toAgentId) {
            // specific delivery logic
        }
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
