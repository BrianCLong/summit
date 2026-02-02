// Maestro Orchestrator Types

export interface MaestroLoop {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'inactive';
  lastDecision?: string;
  lastRun?: string;
  config: Record<string, any>;
}

export interface MaestroAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'inactive' | 'error';
  routingWeight: number;
  metrics: Record<string, number>;
}

export interface MaestroExperiment {
  id: string;
  name: string;
  hypothesis: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  variants: string[];
  metrics: Record<string, any>;
  startDate: string;
  endDate: string;
}

export interface MaestroPlaybook {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  isEnabled: boolean;
  signature?: string;
  version?: string;
}

export type Playbook = MaestroPlaybook;

export interface PlaybookSignature {
  playbookId: string;
  version: string;
  signature: string;
  signer: string;
  timestamp: string;
}

export interface MaestroAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  status: string;
}

export interface CoordinationTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  ownerId: string;
  participants: string[];
  priority: number;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CoordinationChannel {
  id: string;
  topic: string;
  participants: string[];
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ConsensusProposal<T = any> {
  id: string;
  topic: string;
  proposal: T;
  coordinatorId: string;
  voters: string[];
  votes: Record<string, { decision: 'approve' | 'reject' | 'abstain'; reason?: string; weight?: number; timestamp: string }>;
  status: 'voting' | 'approved' | 'rejected' | 'expired';
  deadline: string;
  createdAt: string;
}

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'pending_approval' | 'cancelled';

export interface Task {
  id: string;
  runId: string;
  parentTaskId?: string;
  status: TaskStatus;
  agent: {
    id: string;
    name: string;
    kind: 'llm' | 'tool' | 'human';
    modelId?: string;
  };
  kind: string;
  description: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  tenantId?: string;
  user: { id: string };
  requestText: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  reasoningBudget?: any;
  reasoningBudgetEvidence?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface Artifact {
  id: string;
  runId: string;
  taskId: string;
  kind: 'text' | 'image' | 'data';
  label: string;
  data: any;
  createdAt: string;
}

export interface RunCostSummary {
  runId: string;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Record<string, {
    costUSD: number;
    inputTokens: number;
    outputTokens: number;
  }>;
}

export interface CostSample {
  id: string;
  runId: string;
  timestamp: string;
  cost: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  action: string;
  details: any;
}