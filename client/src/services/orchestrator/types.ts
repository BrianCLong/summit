export type ModuleState = 'offline' | 'starting' | 'running' | 'error';

export interface ModuleTelemetry {
  latencyMs: number;
  throughputPerMinute: number;
  utilization: number;
  reliability: number;
}

export interface ModuleStatus {
  state: ModuleState;
  lastMessage: string;
  updatedAt: string;
  startedAt?: string;
  uptimeMs: number;
  tasksProcessed: number;
  queueDepth: number;
  successCount: number;
  errorCount: number;
  telemetry: ModuleTelemetry;
}

export interface ModuleDefinition {
  id: string;
  displayName: string;
  summary: string;
  kind: string;
  capabilities: string[];
  serviceLevelObjectives: {
    availability: number;
    latencyMs: number;
    throughputPerMinute: number;
  };
}

export interface ModuleAction {
  moduleId: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface OrchestratorTask {
  id: string;
  name: string;
  createdAt: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requestedBy: string;
  actions: ModuleAction[];
  metadata?: Record<string, unknown>;
}

export interface ModuleExecutionResult {
  moduleId: string;
  action: string;
  status: 'success' | 'error';
  message: string;
  output: Record<string, unknown>;
  durationMs: number;
  timestamp: string;
}

export interface TaskRecord {
  task: OrchestratorTask;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'error';
  results: ModuleExecutionResult[];
}

export interface ModuleSnapshot {
  definition: ModuleDefinition;
  status: ModuleStatus;
}

export interface OrchestratorSnapshot {
  modules: ModuleSnapshot[];
  tasks: TaskRecord[];
}

export interface TaskValidationIssue {
  moduleId: string;
  action: string;
  message: string;
}

export interface ModuleHandlerContext {
  action: ModuleAction;
  task: OrchestratorTask;
  status: ModuleStatus;
  definition: ModuleDefinition;
}

export interface ModuleHandlerResult {
  message: string;
  output?: Record<string, unknown>;
  telemetry?: Partial<ModuleTelemetry>;
}
