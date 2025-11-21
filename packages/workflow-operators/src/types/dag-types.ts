/**
 * Local type definitions to replace @summit/dag-engine imports
 */

export type TaskState =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'retrying';

export interface WorkflowExecution {
  executionId: string;
  dagId: string;
  state: TaskState;
  startTime: Date;
  endTime?: Date;
  params?: Record<string, any>;
  variables?: Record<string, any>;
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
  output?: any;
  error?: string;
}

export interface ExecutionContext {
  executionId: string;
  dagId: string;
  taskId: string;
  executionDate: Date;
  attempt: number;
  params: Record<string, any>;
  variables: Record<string, any>;
  getTaskOutput: (taskId: string) => Promise<any>;
}

export interface Operator {
  execute(context: ExecutionContext): Promise<any>;
}

export interface DAGConfig {
  dagId: string;
  description?: string;
  schedule?: string;
  tasks: TaskConfig[];
  defaultArgs?: Record<string, any>;
}

export interface TaskConfig {
  taskId: string;
  operator: string;
  config: Record<string, any>;
  dependencies?: string[];
  retries?: number;
  retryDelay?: number;
}
