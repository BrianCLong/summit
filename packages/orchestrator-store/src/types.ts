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

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  status: string;
}

export interface OrchestratorStoreConfig {
  pool: any; // Pool from 'pg' library
}