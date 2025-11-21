/**
 * Local type definitions that mirror @summit/dag-engine types
 * This avoids cross-package compilation issues
 */

export type TaskState =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'upstream_failed'
  | 'cancelled'
  | 'retrying';

export interface ExecutionContext {
  dagId: string;
  taskId: string;
  executionDate: Date;
  startDate: Date;
  endDate?: Date;
  attempt: number;
  params: Record<string, unknown>;
  conf: Record<string, unknown>;
  previousTaskInstance?: TaskExecution;
}

export interface TaskExecution {
  taskId: string;
  dagId: string;
  workflowExecutionId: string;
  state: TaskState;
  attempt: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  output?: unknown;
  error?: string;
}

export interface Sensor {
  execute(context: ExecutionContext): Promise<boolean>;
}
