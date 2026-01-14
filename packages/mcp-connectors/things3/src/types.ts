export type TaskStatus = 'open' | 'completed' | 'canceled';

export interface TaskRef {
  id: string;
  title?: string;
  notes?: string;
  status?: TaskStatus;
  tags?: string[];
  due?: string;
  scheduled?: string;
  project?: string;
  area?: string;
  url?: string;
  idempotencyKey?: string;
  raw?: unknown;
}

export interface TaskSearchFilters {
  status?: TaskStatus;
  tag?: string;
  project?: string;
  area?: string;
  limit?: number;
}

export interface TaskSpec {
  title: string;
  notes?: string;
  due?: string;
  scheduled?: string;
  tags?: string[];
  project?: string;
  area?: string;
  url?: string;
  status?: TaskStatus;
}

export interface TaskPatch {
  title?: string;
  notes?: string;
  due?: string;
  scheduled?: string;
  tags?: string[];
  project?: string;
  area?: string;
  status?: TaskStatus;
}

export interface TaskUpdatePreconditions {
  expectedStatus?: TaskStatus;
  expectedNotesHash?: string;
  moveReason?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, unknown>;
  };
}

export interface MCPClient {
  listTools: () => Promise<{ tools: MCPTool[] }>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export type TaskOperation = 'search' | 'create' | 'update';

export interface TaskStorePolicyConfig {
  allowedOperations?: TaskOperation[];
  writeEnabled?: boolean;
  dryRun?: boolean;
  allowedTags?: string[];
  allowedProjects?: string[];
  allowedAreas?: string[];
  rateLimitPerMinute?: number;
  requireMoveReason?: boolean;
}

export interface TaskStoreEvidenceConfig {
  enabled?: boolean;
  artifactsDir?: string;
  runId?: string;
  redactKeys?: string[];
  maxResponseBytes?: number;
}

export interface TaskStoreConfig {
  agentId?: string;
  policy?: TaskStorePolicyConfig;
  evidence?: TaskStoreEvidenceConfig;
  toolOverrides?: Partial<Record<TaskOperation, string>>;
}

export interface TaskStore {
  searchTasks: (query: string, filters?: TaskSearchFilters) => Promise<TaskRef[]>;
  createTask: (spec: TaskSpec, idempotencyKey: string) => Promise<TaskRef>;
  updateTask: (
    ref: TaskRef,
    patch: TaskPatch,
    preconditions?: TaskUpdatePreconditions,
  ) => Promise<TaskRef>;
}
