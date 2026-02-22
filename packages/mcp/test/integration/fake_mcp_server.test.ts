import assert from "node:assert";
import { TaskClient, JsonRpcClient } from "../../src/tasks/task_client";
import { withTaskMeta, TASK_META_KEY } from "../../src/tasks/meta";
import { pollUntilTerminal } from "../../src/tasks/poll";
import { TaskGetResult } from "../../src/tasks/types";

class FakeServer implements JsonRpcClient {
    private tasks = new Map<string, TaskGetResult>();
    public handlers = new Map<string, (params: any) => any>();
    public notifications: { method: string, params: any }[] = [];
    public onNotificationHandler?: (method: string, params: any) => void;

    async request<T>(method: string, params?: any): Promise<T> {
        if (method === "tasks/get") {
            const task = this.tasks.get(params.taskId);
            if (!task) throw new Error("Task not found");
            return task as T;
        }
        if (method === "tasks/result") {
             const task = this.tasks.get(params.taskId);
             if (task?.status !== "completed") throw new Error("Task not completed");
             return task.result as T;
        }
        if (this.handlers.has(method)) {
             return this.handlers.get(method)!(params);
        }
        throw new Error(`Method ${method} not found`);
    }
    notify(method: string, params?: any): void { this.notifications.push({ method, params }); }
    onNotification(handler: (method: string, params: any) => void): void { this.onNotificationHandler = handler; }

    emitTaskCreated(taskId: string) {
        this.tasks.set(taskId, { taskId, status: "working", keepAlive: null });
        this.onNotificationHandler?.("notifications/tasks/created", { taskId });
    }
    updateTask(taskId: string, update: Partial<TaskGetResult>) {
        const t = this.tasks.get(taskId);
        if (t) Object.assign(t, update);
    }
}

async function runTests() {
    {
        const server = new FakeServer();
        const client = new TaskClient(server);
        const taskId = "task-123";
        const method = "some/tool";
        const params = withTaskMeta({}, { taskId });

        server.handlers.set(method, (p) => {
            setTimeout(() => server.emitTaskCreated(taskId), 10);
            return { content: "accepted" };
        });

        await server.request(method, params);
        await new Promise(r => setTimeout(r, 20));
        setTimeout(() => server.updateTask(taskId, { status: "completed", result: "final result" }), 50);

        const result = await pollUntilTerminal({ tasks: client, taskId, defaultPollMs: 10 });
        assert.equal(result.status, "completed");
        const finalPayload = await client.result(taskId);
        assert.equal(finalPayload, "final result");
        console.log("Scenario 1 passed");
    }
}
runTests().catch(e => { console.error(e); process.exit(1); });
