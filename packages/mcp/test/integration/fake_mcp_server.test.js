"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const task_client_1 = require("../../src/tasks/task_client");
const meta_1 = require("../../src/tasks/meta");
const poll_1 = require("../../src/tasks/poll");
class FakeServer {
    tasks = new Map();
    handlers = new Map();
    notifications = [];
    onNotificationHandler;
    async request(method, params) {
        if (method === "tasks/get") {
            const task = this.tasks.get(params.taskId);
            if (!task)
                throw new Error("Task not found");
            return task;
        }
        if (method === "tasks/result") {
            const task = this.tasks.get(params.taskId);
            if (task?.status !== "completed")
                throw new Error("Task not completed");
            return task.result;
        }
        if (this.handlers.has(method)) {
            return this.handlers.get(method)(params);
        }
        throw new Error(`Method ${method} not found`);
    }
    notify(method, params) { this.notifications.push({ method, params }); }
    onNotification(handler) { this.onNotificationHandler = handler; }
    emitTaskCreated(taskId) {
        this.tasks.set(taskId, { taskId, status: "working", keepAlive: null });
        this.onNotificationHandler?.("notifications/tasks/created", { taskId });
    }
    updateTask(taskId, update) {
        const t = this.tasks.get(taskId);
        if (t)
            Object.assign(t, update);
    }
}
async function runTests() {
    {
        const server = new FakeServer();
        const client = new task_client_1.TaskClient(server);
        const taskId = "task-123";
        const method = "some/tool";
        const params = (0, meta_1.withTaskMeta)({}, { taskId });
        server.handlers.set(method, (p) => {
            setTimeout(() => server.emitTaskCreated(taskId), 10);
            return { content: "accepted" };
        });
        await server.request(method, params);
        await new Promise(r => setTimeout(r, 20));
        setTimeout(() => server.updateTask(taskId, { status: "completed", result: "final result" }), 50);
        const result = await (0, poll_1.pollUntilTerminal)({ tasks: client, taskId, defaultPollMs: 10 });
        node_assert_1.default.equal(result.status, "completed");
        const finalPayload = await client.result(taskId);
        node_assert_1.default.equal(finalPayload, "final result");
        console.log("Scenario 1 passed");
    }
}
runTests().catch(e => { console.error(e); process.exit(1); });
