export type RunSpanKind = 'queue' | 'exec' | 'io' | 'compute' | 'external';
export type RunSpanStatus = 'ok' | 'error';

export interface RunSpanResources {
  cpuAllocated?: number;
  memAllocatedMb?: number;
  cpuUtilPct?: number;
  memUtilPct?: number;
}

export interface RunSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  runId: string;
  tenantId?: string;
  stage: string;
  kind: RunSpanKind;
  startTimeMs: number;
  endTimeMs: number;
  status: RunSpanStatus;
  retryCount?: number;
  attributes?: Record<string, string | number | boolean>;
  resources?: RunSpanResources;
}

export interface TagDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  scope: 'run' | 'stage' | 'system';
  pii?: boolean;
}

export interface TagValidationResult {
  valid: Record<string, string | number | boolean>;
  invalidKeys: string[];
}

export interface RunTreeNode {
  spanId: string;
  parentSpanId?: string | null;
  runId: string;
  stage: string;
  kind: RunSpanKind;
  status: RunSpanStatus;
  startTimeMs: number;
  endTimeMs: number;
  retryCount: number;
  attributes: Record<string, string | number | boolean>;
  durationMs: number;
  children: RunTreeNode[];
  onCriticalPath?: boolean;
}

export interface RunAggregate {
  runId: string;
  traceId: string;
  tenantId?: string;
  totalDurationMs: number;
  queueWaitMs: number;
  execMs: number;
  bestCaseDurationMs: number;
  wastedQueueMs: number;
  criticalPathStages: string[];
  errorCount: number;
  retryCount: number;
  startedAt: Date;
  finishedAt: Date;
  status: RunSpanStatus;
}

export interface RunAggregateFilters {
  since?: Date;
  until?: Date;
  stage?: string;
  status?: RunSpanStatus;
  minWastedQueueMs?: number;
  limit?: number;
  offset?: number;
}

export interface RunAggregateWithTree {
  aggregate: RunAggregate;
  tree: RunTreeNode[];
}
