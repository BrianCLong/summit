export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error' | 'terminated';

export interface AgentCapability {
  name: string;
  version: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface AgentConstraints {
  maxConcurrentTasks?: number;
  resourceLimits?: {
    cpu?: number;
    memory?: number;
  };
  allowedTools?: string[];
  requiredClearance?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  capabilities: AgentCapability[];
  constraints: AgentConstraints;
  status: AgentStatus;
  lastHeartbeat: Date;
  metadata?: Record<string, any>;
  version: string;
}

export interface TaskDependency {
  taskId: string;
  condition?: string; // e.g., "success", "complete"
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedTo?: string; // Agent ID
  priority: TaskPriority;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  dependencies: TaskDependency[];
  input: Record<string, any>;
  output?: Record<string, any>;
  createdAt: Date;
  deadline?: Date;
  requiredCapabilities?: string[];
  requiredClearance?: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId?: string; // If null, broadcast or system
  type: 'task_request' | 'task_response' | 'status_update' | 'coordination' | 'error';
  payload: any;
  timestamp: Date;
  conversationId?: string;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  modifications?: Record<string, any>;
  violations?: string[];
}

export interface ConsensusRequest {
  id: string;
  topic: string;
  options: any[];
  participants: string[]; // Agent IDs
  strategy: 'majority' | 'unanimous' | 'weighted';
  deadline: Date;
}

export interface ConsensusResult {
  requestId: string;
  outcome: any; // Selected option
  confidence: number;
  votes: Record<string, any>; // AgentID -> Vote
  timestamp: Date;
}
