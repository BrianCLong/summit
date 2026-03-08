"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatusPublisher = void 0;
class TaskStatusPublisher {
    ws;
    constructor(ws) {
        this.ws = ws;
    }
    publishUpdate(taskId, status, meta) {
        this.ws.broadcast(`task:${taskId}`, {
            id: taskId,
            topic: `task:${taskId}`,
            type: "status_update",
            data: { taskId, status, ...meta },
            timestamp: new Date(),
        });
    }
}
exports.TaskStatusPublisher = TaskStatusPublisher;
