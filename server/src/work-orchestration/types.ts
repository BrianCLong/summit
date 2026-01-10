export type DurableStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type HookStatus = 'idle' | 'active' | 'paused' | 'draining';

export type ConvoyStatus =
  | 'forming'
  | 'in-progress'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentRole =
  | 'planner'
  | 'witness'
  | 'refinery'
  | 'deacon'
  | 'worker';

export type EventLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface DurableEvent {
  id: string;
  entityType:
    | 'task'
    | 'convoy'
    | 'agent'
    | 'hook'
    | 'molecule'
    | 'formula'
    | 'step'
    | 'policy'
    | 'run-digest';
  entityId: string;
  eventType: string;
  level: EventLevel;
  payload: Record<string, unknown>;
  actorAgentId?: string;
  tenantId: string;
  createdAt: string;
  wispId?: string;
}

export interface WorkTask {
  id: string;
  tenantId: string;
  convoyId?: string;
  formulaId?: string;
  moleculeId?: string;
  stepId?: string;
  status: DurableStatus;
  assigneeAgentId?: string;
  hookId?: string;
  idempotencyKey?: string;
  dependencies: string[];
  attempts: number;
  maxAttempts: number;
  acceptanceCriteria: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  metadata: Record<string, unknown>;
}

export interface Convoy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: ConvoyStatus;
  taskIds: string[];
  moleculeIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  targetCompletion?: string;
  progress: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
  };
  metadata: Record<string, unknown>;
}

export interface AgentIdentity {
  id: string;
  tenantId: string;
  handle: string;
  role: AgentRole;
  capabilities: string[];
  hookId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface Hook {
  id: string;
  tenantId: string;
  agentId: string;
  status: HookStatus;
  queueDepth: number;
  assignedTaskIds: string[];
  lastClaimedAt?: string;
  lastHeartbeatAt?: string;
  metadata: Record<string, unknown>;
}

export interface Formula {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  description?: string;
  template: FormulaTemplate;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface Molecule {
  id: string;
  tenantId: string;
  formulaId: string;
  convoyId: string;
  status: DurableStatus;
  stepIds: string[];
  cursor: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MoleculeStep {
  id: string;
  tenantId: string;
  moleculeId: string;
  name: string;
  status: DurableStatus;
  dependsOn: string[];
  acceptanceCriteria: string[];
  assignedHookId?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface RunDigest {
  id: string;
  tenantId: string;
  convoyId?: string;
  wispId: string;
  summary: string;
  startedAt: string;
  finishedAt: string;
  eventCount: number;
  digest: Record<string, unknown>;
  createdAt: string;
}

export interface DependencyEdge {
  id: string;
  tenantId: string;
  fromId: string;
  toId: string;
  kind: 'blocks' | 'requires' | 'relates';
  createdAt: string;
}

export interface FormulaStepTemplate {
  name: string;
  dependsOn?: string[];
  acceptanceCriteria?: string[];
  hookRole?: AgentRole;
  metadata?: Record<string, unknown>;
}

export interface FormulaTemplate {
  name: string;
  version: string;
  steps: FormulaStepTemplate[];
  metadata?: Record<string, unknown>;
}
