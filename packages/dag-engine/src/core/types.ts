/**
 * Core types for DAG-based workflow engine
 */

export type TaskState =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'upstream_failed'
  | 'retrying'
  | 'cancelled';

export type TriggerRule =
  | 'all_success'      // All upstream tasks succeeded
  | 'all_failed'       // All upstream tasks failed
  | 'all_done'         // All upstream tasks completed (any state)
  | 'one_success'      // At least one upstream task succeeded
  | 'one_failed'       // At least one upstream task failed
  | 'none_failed'      // No upstream tasks failed (success or skipped)
  | 'none_skipped'     // No upstream tasks were skipped
  | 'always';          // Always run regardless of upstream state

export interface TaskRetryPolicy {
  maxRetries: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  backoffMultiplier?: number;
  maxRetryDelay?: number;
}

export interface TaskTimeout {
  execution?: number;    // Max execution time in ms
  sla?: number;         // SLA time in ms
}

export interface TaskConfig {
  taskId: string;
  operator: string;
  params?: Record<string, any>;
  dependencies?: string[];
  triggerRule?: TriggerRule;
  retryPolicy?: TaskRetryPolicy;
  timeout?: TaskTimeout;
  priority?: number;
  pool?: string;
  queue?: string;
  resources?: {
    cpu?: number;
    memory?: number;
    gpu?: number;
  };
  onSuccess?: string[];
  onFailure?: string[];
  metadata?: Record<string, any>;
}

export interface DAGConfig {
  dagId: string;
  description?: string;
  schedule?: string;        // Cron expression
  startDate?: Date;
  endDate?: Date;
  catchup?: boolean;
  maxActiveRuns?: number;
  concurrency?: number;
  defaultArgs?: Partial<TaskConfig>;
  tags?: string[];
  params?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface WorkflowExecution {
  executionId: string;
  dagId: string;
  state: TaskState;
  startTime: Date;
  endTime?: Date;
  executionDate: Date;
  params?: Record<string, any>;
  context?: Record<string, any>;
}

export interface TaskExecution {
  executionId: string;
  taskId: string;
  dagId: string;
  workflowExecutionId: string;
  state: TaskState;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  attempt: number;
  maxAttempts: number;
  output?: any;
  error?: string;
  logs?: string[];
  metadata?: Record<string, any>;
}

export interface TaskInstance {
  taskId: string;
  state: TaskState;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  attempt: number;
  output?: any;
  error?: Error;
}

export interface DAGNode {
  taskId: string;
  config: TaskConfig;
  upstream: Set<string>;
  downstream: Set<string>;
}

export interface ExecutionContext {
  executionId: string;
  dagId: string;
  executionDate: Date;
  params: Record<string, any>;
  taskId: string;
  attempt: number;
  variables: Record<string, any>;
  getTaskOutput(taskId: string): Promise<any>;
  setVariable(key: string, value: any): void;
  getVariable(key: string): any;
}

export interface Operator {
  execute(context: ExecutionContext): Promise<any>;
  onSuccess?(context: ExecutionContext, output: any): Promise<void>;
  onFailure?(context: ExecutionContext, error: Error): Promise<void>;
  onRetry?(context: ExecutionContext, error: Error, attempt: number): Promise<void>;
}

export interface Sensor extends Operator {
  poke(context: ExecutionContext): Promise<boolean>;
  pokeInterval?: number;
  timeout?: number;
  mode?: 'poke' | 'reschedule';
}

export interface Hook {
  beforeDAGRun?(dagId: string, executionId: string): Promise<void>;
  afterDAGRun?(dagId: string, executionId: string, state: TaskState): Promise<void>;
  beforeTaskRun?(context: ExecutionContext): Promise<void>;
  afterTaskRun?(context: ExecutionContext, state: TaskState): Promise<void>;
}
