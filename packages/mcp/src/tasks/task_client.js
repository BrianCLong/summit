"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskClient = void 0;
class TaskClient {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
    }
    async get(taskId) {
        return await this.rpc.request("tasks/get", { taskId });
    }
    async result(taskId) {
        return await this.rpc.request("tasks/result", { taskId });
    }
    async list(cursor) {
        return await this.rpc.request("tasks/list", cursor ? { cursor } : {});
    }
    async delete(taskId) {
        return await this.rpc.request("tasks/delete", { taskId });
    }
    cancelByRequestId(requestId) {
        this.rpc.notify("notifications/cancelled", { requestId });
    }
}
exports.TaskClient = TaskClient;
