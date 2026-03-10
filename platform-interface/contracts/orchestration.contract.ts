/**
 * Orchestration API Contract
 *
 * Cross-domain contract for agent and workflow orchestration.
 * Enforced by Interface Spine (LAW-ASP).
 *
 * Implementer: agent-orchestration domain
 * Consumers: intelligence-platform, ml-platform, autonomous-ops
 */

export interface OrchestrationAPI {
  // Agent operations
  invokeAgent(request: AgentInvocation): Promise<AgentResponse>;
  getAgentStatus(agentId: string): Promise<AgentStatus>;
  cancelAgent(agentId: string): Promise<void>;

  // Workflow operations
  executeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowExecution>;
  getWorkflowStatus(executionId: string): Promise<WorkflowStatus>;
  cancelWorkflow(executionId: string): Promise<void>;

  // Coordination operations
  coordinateAgents(request: CoordinationRequest): Promise<CoordinationResult>;
  resolveConflict(conflict: AgentConflict): Promise<ConflictResolution>;
}

// Agent Types
export interface AgentInvocation {
  agentType: AgentType;
  task: Task;
  context?: AgentContext;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export type AgentType =
  | 'intelligence-analyst'
  | 'data-processor'
  | 'pattern-miner'
  | 'consolidation-agent'
  | 'healing-agent'
  | 'synthesis-agent';

export interface Task {
  id: string;
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  constraints?: TaskConstraints;
}

export interface TaskConstraints {
  maxDuration?: number;
  maxResources?: ResourceLimits;
  dependencies?: string[];
}

export interface ResourceLimits {
  cpu?: number;
  memory?: number;
  storage?: number;
}

export interface AgentContext {
  user?: string;
  session?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse {
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: unknown;
  error?: AgentError;
  metrics?: AgentMetrics;
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AgentMetrics {
  duration: number;
  resourcesUsed: ResourceUsage;
  stepsCompleted: number;
  confidence?: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  storage?: number;
  apiCalls?: number;
}

export interface AgentStatus {
  agentId: string;
  type: AgentType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep?: string;
  startedAt: string;
  completedAt?: string;
}

// Workflow Types
export interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
  failurePolicy?: FailurePolicy;
  retryPolicy?: RetryPolicy;
}

export interface WorkflowStep {
  id: string;
  type: 'agent' | 'decision' | 'parallel' | 'loop';
  config: StepConfig;
  dependencies?: string[];
}

export interface StepConfig {
  agent?: AgentInvocation;
  decision?: DecisionConfig;
  parallel?: ParallelConfig;
  loop?: LoopConfig;
}

export interface DecisionConfig {
  condition: string;
  then: WorkflowStep[];
  else?: WorkflowStep[];
}

export interface ParallelConfig {
  branches: WorkflowStep[][];
  mergeStrategy: 'all' | 'first' | 'any';
}

export interface LoopConfig {
  condition: string;
  steps: WorkflowStep[];
  maxIterations: number;
}

export interface FailurePolicy {
  strategy: 'fail-fast' | 'continue' | 'rollback';
  notifyOnFailure: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialBackoff: number;
}

export interface WorkflowExecution {
  executionId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowStatus {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  completedSteps: string[];
  progress: number;
  result?: unknown;
  error?: AgentError;
}

// Coordination Types
export interface CoordinationRequest {
  agents: AgentInvocation[];
  coordinationStrategy: CoordinationStrategy;
  conflictResolution?: ConflictResolutionStrategy;
}

export type CoordinationStrategy =
  | 'sequential'
  | 'parallel'
  | 'priority-based'
  | 'market-based';

export type ConflictResolutionStrategy =
  | 'priority'
  | 'consensus'
  | 'voting'
  | 'arbiter';

export interface CoordinationResult {
  coordinationId: string;
  agents: AgentStatus[];
  conflicts: AgentConflict[];
  resolutions: ConflictResolution[];
  overallStatus: 'coordinating' | 'completed' | 'failed';
}

export interface AgentConflict {
  id: string;
  agents: string[];
  resource?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  winner?: string;
  compromise?: Record<string, unknown>;
  reasoning: string;
}
