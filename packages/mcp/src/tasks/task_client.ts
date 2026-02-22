import { TaskGetResult } from "./types";

export interface JsonRpcClient {
  request<T>(method: string, params?: any): Promise<T>;
  notify(method: string, params?: any): void;
  onNotification?(handler: (method: string, params: any) => void): void;
}

export class TaskClient {
  constructor(private readonly rpc: JsonRpcClient) {}

  async get(taskId: string): Promise<TaskGetResult> {
    return await this.rpc.request<TaskGetResult>("tasks/get", { taskId });
  }

  async result<T = any>(taskId: string): Promise<T> {
    return await this.rpc.request<T>("tasks/result", { taskId });
  }

  async list(cursor?: string): Promise<{ tasks: TaskGetResult[]; nextCursor?: string }> {
    return await this.rpc.request("tasks/list", cursor ? { cursor } : {});
  }

  async delete(taskId: string): Promise<{ deleted?: boolean }> {
    return await this.rpc.request("tasks/delete", { taskId });
  }

  cancelByRequestId(requestId: string): void {
    this.rpc.notify("notifications/cancelled", { requestId });
  }
}
