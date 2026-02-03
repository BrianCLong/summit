import { StreamingWebSocketServer } from "@intelgraph/streaming-api";

export class TaskStatusPublisher {
  constructor(private ws: StreamingWebSocketServer) {}

  publishUpdate(taskId: string, status: string, meta?: any) {
    this.ws.broadcast(`task:${taskId}`, {
      id: taskId,
      topic: `task:${taskId}`,
      type: "status_update",
      data: { taskId, status, ...meta },
      timestamp: new Date(),
    });
  }
}
