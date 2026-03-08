"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpTaskJobHandler = void 0;
// @ts-ignore
const poll_1 = require("@intelgraph/mcp/src/tasks/poll");
class McpTaskJobHandler {
    tasks;
    constructor(tasks) {
        this.tasks = tasks;
    }
    async run(job) {
        const data = job.data;
        if (!data.taskId)
            throw new Error("Missing taskId");
        const terminalState = await poll_1.pollUntilTerminal({
            tasks: this.tasks,
            taskId: data.taskId,
            defaultPollMs: data.pollConfig?.defaultPollMs,
            maxMs: data.pollConfig?.maxMs,
        });
        if (terminalState.status === "completed") {
            return await this.tasks.result(data.taskId);
        }
        else if (terminalState.status === "failed") {
            throw new Error(terminalState.error || "Task failed");
        }
        else if (terminalState.status === "cancelled") {
            throw new Error("Task cancelled");
        }
        return terminalState;
    }
}
exports.McpTaskJobHandler = McpTaskJobHandler;
