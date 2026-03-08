"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const task_queue_js_1 = require("../queue/task-queue.js");
const DETERMINISTIC_FLOW = ["planner", "builder", "reviewer", "governance"];
class AgentOrchestrator {
    agents = new Map();
    queue;
    constructor(queue) {
        this.queue =
            queue ??
                new task_queue_js_1.TaskQueue({
                    concurrency: 1,
                    defaultMaxAttempts: 3,
                });
    }
    registerAgent(agent) {
        this.agents.set(agent.role, agent);
    }
    getRegisteredAgents() {
        return DETERMINISTIC_FLOW.map((role) => this.agents.get(role)).filter((agent) => Boolean(agent));
    }
    enqueueTask(task) {
        this.queue.enqueue(task, (context) => this.runDeterministicFlow(context.task));
    }
    processNextTask() {
        return this.queue.processNext();
    }
    processAllTasks() {
        return this.queue.processAll();
    }
    async runDeterministicFlow(task) {
        let currentTask = { ...task };
        const timeline = [];
        for (const role of DETERMINISTIC_FLOW) {
            const agent = this.agents.get(role);
            if (!agent) {
                throw new Error(`Missing required agent for role: ${role}`);
            }
            const result = await agent.execute(currentTask);
            timeline.push({
                agent: agent.name,
                role,
                status: result.status,
                outputs: result.outputs,
            });
            if (result.status === "fail") {
                return {
                    taskId: task.id,
                    status: "fail",
                    timeline,
                    output: result.outputs,
                };
            }
            if (result.status === "retry") {
                throw new Error(`Retry requested by ${agent.name}`);
            }
            currentTask = {
                ...currentTask,
                inputs: {
                    ...currentTask.inputs,
                    [role]: result.outputs,
                },
            };
        }
        return {
            taskId: task.id,
            status: "success",
            timeline,
            output: currentTask.inputs,
        };
    }
    getQueueSnapshot() {
        return this.queue.getSnapshot();
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
