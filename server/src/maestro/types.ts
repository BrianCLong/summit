import type {
  ReasoningBudgetContract,
  ReasoningBudgetEvidence,
} from './budget';

export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'pending_approval';

export interface UserRef {
  id: string;
}

export interface AgentRef {
  id: string;
  name: string;
  kind: 'llm' | 'tool' | 'workflow' | 'graph-engine';
  modelId?: string;        // e.g. "openai:gpt-4.1"
  toolName?: string;       // e.g. "bash-shell"
}

export interface Run {
  id: string;
  user: UserRef;
  createdAt: string;
  requestText: string;
  tenantId?: string;
  reasoningBudget?: ReasoningBudgetContract;
  reasoningBudgetEvidence?: ReasoningBudgetEvidence;
}

export interface Task {
  id: string;
  runId: string;
  parentTaskId?: string;
  status: TaskStatus;
  agent: AgentRef;
  kind: 'plan' | 'action' | 'subworkflow' | 'graph.analysis';
  description: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  runId: string;
  taskId: string;
  kind: 'text' | 'json' | 'file' | 'graph';
  label: string;
  data: unknown; // or a typed union if you want stricter types
  createdAt: string;
}

export interface CostSample {
  id: string;
  runId: string;
  taskId: string;
  model: string;
  vendor: 'openai' | 'anthropic' | 'google' | 'local';
  inputTokens: number;
  outputTokens: number;
  currency: 'USD';
  cost: number;
  createdAt: string;
  feature?: string;
  tenantId?: string;
  environment?: string;
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

// Coordination Types for Subagent Collaboration (Added in Phase 3)
export interface CoordinationTask {
  id: string;
  title: string;
  description: string;
  assignedAgentIds: string[];
  dependencies?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  payload: Record<string, any>;
  status: 'pending' | 'delegated' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  result?: any;
  error?: string;
}

export interface CoordinationChannel {
  id: string;
  participants: string[];
  topic: string;  // What they're coordinating about (e.g., "threat-analysis", "entity-resolution")
  messages: CoordinationMessage[];
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
}

export interface CoordinationMessage {
  id: string;
  senderId: string;
  recipientId?: string;  // If null, broadcast to channel
  timestamp: Date;
  type: 'TASK_ASSIGNMENT' | 'TASK_RESULT' | 'REQUEST_HELP' | 'REQUEST_REVIEW' | 'CONSENSUS_PROPOSAL' | 'CONSENSUS_VOTE' | 'STATUS_UPDATE' | 'COORDINATION_MESSAGE';
  content: string;
  attachments?: any[];
  correlationId?: string;  // For linking related messages
  metadata?: Record<string, any>;
}

export interface ConsensusProposal<T = any> {
  id: string;
  coordinatorId: string;
  topic: string;
  proposal: T;
  voters: string[];  // Agent IDs that should vote
  votingDeadline: Date;
  votes: Map<string, { vote: 'approve' | 'reject' | 'abstain'; timestamp: Date; rationale?: string }>;
  status: 'draft' | 'in_voting' | 'passed' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt?: Date;
  closedAt?: Date;
}

export interface AgentCoordinationMetrics {
  coordinationMessagesSent: number;
  coordinationMessagesReceived: number;
  collaborativeTasksCompleted: number;
  consensusDecisionsMade: number;
  resourceSharingEvents: number;
  conflictResolutionEvents: number;
  averageCollaborationTimeMs: number;
  updatedAt?: Date;
}

export interface PlaybookSignature {
  algorithm: 'ed25519';
  signature: string;
  publicKey: string;
  signedAt: string;
}

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  triggers: string[];
  actions: string[];
  isEnabled: boolean;
  version?: string;
  signature?: PlaybookSignature;
}
