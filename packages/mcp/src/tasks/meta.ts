import { TaskMetaRequest } from "./types";

export const TASK_META_KEY = "modelcontextprotocol.io/task" as const;
export const RELATED_TASK_META_KEY = "modelcontextprotocol.io/related-task" as const;

export function withTaskMeta(params: any, task: TaskMetaRequest): any {
  const _meta = { ...(params?._meta ?? {}) };
  _meta[TASK_META_KEY] = { taskId: task.taskId, ...(task.keepAlive != null ? { keepAlive: task.keepAlive } : {}) };
  return { ...(params ?? {}), _meta };
}

export function extractRelatedTaskId(params: any): string | null {
  const t = params?._meta?.[RELATED_TASK_META_KEY];
  return typeof t?.taskId === "string" ? t.taskId : null;
}
