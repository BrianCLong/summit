export enum AgentStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR'
}

export interface AgentHealth {
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeat: Date;
  activeTasks: number;
  errorRate: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: AgentStatus;
  health: AgentHealth;
  config: Record<string, any>;
  tenantId: string;
}

export enum NegotiationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Proposal {
  id: string;
  agentId: string;
  content: any;
  timestamp: Date;
  score?: number;
}

export interface NegotiationRound {
  id: string;
  roundNumber: number;
  proposals: Proposal[];
  consensusReached: boolean;
  summary?: string;
}

export interface Negotiation {
  id: string;
  initiatorId: string;
  participantIds: string[];
  topic: string;
  status: NegotiationStatus;
  rounds: NegotiationRound[];
  finalAgreement?: any;
  context: Record<string, any>;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrchestratorConfig {
  heartbeatIntervalMs: number;
  maxNegotiationRounds: number;
}
