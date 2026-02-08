export type TaskStatus =
  | "submitted"
  | "working"
  | "input_required"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export interface TaskMetaRequest {
  taskId: string;          // client-generated
  keepAlive?: number;      // ms
}

export interface TaskGetResult {
  taskId: string;
  status: TaskStatus;
  keepAlive: number | null;
  pollFrequency?: number;
  error?: string;
  result?: any;
}
