/**
 * Agent Framework Types
 * Part of AGENT-1 through AGENT-16 implementation
 */

// ============================================================================
// AGENT-1: Agent Entity & Identity
// ============================================================================

export type AgentType = 'internal' | 'external' | 'partner';
export type AgentStatus = 'active' | 'suspended' | 'retired';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  agentType: AgentType;
  version: string;

  // Scoping
  organizationId?: string;
  tenantScopes: string[]; // Tenant IDs this agent can access
  projectScopes: string[]; // Project IDs this agent can access

  // Status
  status: AgentStatus;
  isCertified: boolean;
  certificationDate?: Date;
  certificationExpiresAt?: Date;

  // Capabilities
  capabilities: string[]; // e.g., ['read:entities', 'write:entities', 'execute:pipelines']
  restrictions: AgentRestrictions;

  // Metadata
  ownerId?: string;
  metadata: Record<string, unknown>;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AgentRestrictions {
  maxRiskLevel: RiskLevel; // Maximum risk level allowed without approval
  requireApproval: RiskLevel[]; // Risk levels that require approval
  allowedOperations?: string[]; // Specific operations allowed
  deniedOperations?: string[]; // Specific operations denied
  maxDailyRuns?: number;
  maxConcurrentRuns?: number;
}

export type CredentialType = 'api_key' | 'oauth_client' | 'service_account';

export interface AgentCredential {
  id: string;
  agentId: string;
  credentialType: CredentialType;
  keyHash: string; // Bcrypt or similar hash
  keyPrefix: string; // For display purposes (e.g., "agt_abc...")
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastRotatedAt: Date;
  rotationRequiredAt?: Date;
  isActive: boolean;
  revokedAt?: Date;
  revocationReason?: string;
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AGENT-2: Principal Type for Auth
// ============================================================================

export type PrincipalType = 'USER' | 'AGENT' | 'SERVICE';

export interface AgentPrincipal {
  id: string;
  type: 'AGENT';
  agentId: string;
  agentName: string;
  organizationId?: string;
  tenantScopes: string[];
  projectScopes: string[];
  capabilities: string[];
  restrictions: AgentRestrictions;
}

// ============================================================================
// AGENT-5: Operation Modes
// ============================================================================

export type OperationMode = 'SIMULATION' | 'DRY_RUN' | 'ENFORCED';

export interface OperationModeConfig {
  mode: OperationMode;
  description: string;
  allowsExecution: boolean;
  allowsSideEffects: boolean;
  requiresApproval: boolean;
}

export const OPERATION_MODES: Record<OperationMode, OperationModeConfig> = {
  SIMULATION: {
    mode: 'SIMULATION',
    description: 'Actions are evaluated but not executed. Returns "would do X" without any side effects.',
    allowsExecution: false,
    allowsSideEffects: false,
    requiresApproval: false,
  },
  DRY_RUN: {
    mode: 'DRY_RUN',
    description: 'Limited side-effects allowed (e.g., planning). No actual data modifications.',
    allowsExecution: false,
    allowsSideEffects: true, // Limited: planning, validation, etc.
    requiresApproval: false,
  },
  ENFORCED: {
    mode: 'ENFORCED',
    description: 'Real execution with full side effects. Requires proper authorization.',
    allowsExecution: true,
    allowsSideEffects: true,
    requiresApproval: true, // For high-risk actions
  },
};

// ============================================================================
// AGENT-7: Agent Runs & Execution
// ============================================================================

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'api';

export interface AgentRun {
  id: string;
  agentId: string;
  tenantId: string;
  projectId?: string;
  operationMode: OperationMode;
  triggerType: TriggerType;
  triggerSource?: Record<string, unknown>;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  actionsProposed: AgentAction[];
  actionsExecuted: AgentAction[];
  actionsDenied: AgentAction[];
  outcome?: Record<string, unknown>;
  error?: AgentRunError;
  traceId?: string; // OpenTelemetry trace ID
  spanId?: string; // OpenTelemetry span ID
  durationMs?: number;
  tokensConsumed?: number;
  apiCallsMade: number;
  createdAt: Date;
}

export interface AgentRunError {
  code: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// AGENT Actions & Risk Assessment
// ============================================================================

export type ActionType =
  | 'read'
  | 'write'
  | 'delete'
  | 'execute'
  | 'query'
  | 'pipeline:trigger'
  | 'config:modify'
  | 'user:impersonate'
  | 'export'
  | 'import';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AuthorizationStatus =
  | 'allowed'
  | 'denied'
  | 'requires_approval'
  | 'approved'
  | 'rejected';

export interface AgentAction {
  id: string;
  runId: string;
  agentId: string;
  actionType: ActionType;
  actionTarget?: string; // Resource ID, endpoint, etc.
  actionPayload?: Record<string, unknown>;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  policyDecision?: PolicyDecision;
  authorizationStatus: AuthorizationStatus;
  denialReason?: string;
  requiresApproval: boolean;
  approvalId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  executed: boolean;
  executionResult?: Record<string, unknown>;
  executionError?: string;
  executedAt?: Date;
  createdAt: Date;
}

export interface RiskFactor {
  factor: string;
  severity: RiskLevel;
  description: string;
  mitigation?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  obligations: PolicyObligation[];
  matchedPolicies: string[];
}

export interface PolicyObligation {
  type: string;
  requirement?: string;
  target?: string;
  [key: string]: unknown;
}

// ============================================================================
// AGENT-9: Approval Workflow
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface AgentApproval {
  id: string;
  agentId: string;
  runId: string;
  actionId?: string;
  requestSummary: string;
  requestDetails: Record<string, unknown>;
  riskLevel: RiskLevel;
  riskAssessment?: RiskAssessment;
  assignedTo: string[]; // User IDs
  assignedRoles: string[]; // Roles that can approve
  status: ApprovalStatus;
  decisionMadeBy?: string;
  decisionMadeAt?: Date;
  decisionReason?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  factors: RiskFactor[];
  impact: string[];
  recommendations: string[];
  autoApprovalEligible: boolean;
}

export interface ApprovalRequest {
  agentId: string;
  runId: string;
  actionId?: string;
  summary: string;
  details: Record<string, unknown>;
  riskLevel: RiskLevel;
  assignedTo: string[];
  expiresInMinutes: number;
}

export interface ApprovalDecision {
  approvalId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  userId: string;
}

// ============================================================================
// AGENT-8: Quotas & Rate Limiting
// ============================================================================

export type QuotaType =
  | 'daily_runs'
  | 'monthly_runs'
  | 'daily_tokens'
  | 'monthly_tokens'
  | 'daily_api_calls'
  | 'monthly_api_calls'
  | 'hourly_api_calls';

export interface AgentQuota {
  id: string;
  agentId: string;
  quotaType: QuotaType;
  quotaLimit: number;
  quotaUsed: number;
  periodStart: Date;
  periodEnd: Date;
  resetAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaCheck {
  allowed: boolean;
  quotaType: QuotaType;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: Date;
}

// ============================================================================
// AGENT-16: Metrics & Monitoring
// ============================================================================

export interface AgentMetrics {
  id: string;
  agentId: string;
  metricDate: Date;
  metricHour?: number; // 0-23 for hourly metrics
  runsTotal: number;
  runsSuccessful: number;
  runsFailed: number;
  runsCancelled: number;
  actionsProposed: number;
  actionsExecuted: number;
  actionsDenied: number;
  highRiskActions: number;
  criticalRiskActions: number;
  policyViolations: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  totalTokensConsumed: number;
  totalApiCalls: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  createdAt: Date;
}

export interface AgentHealthStatus {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastRunAt?: Date;
  last24Hours: {
    runs: number;
    successRate: number;
    errorRate: number;
    avgDurationMs: number;
  };
  quotas: QuotaCheck[];
  alerts: AgentAlert[];
}

export interface AgentAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// AGENT-13: Audit Log
// ============================================================================

export type AuditEventType =
  | 'agent_created'
  | 'agent_updated'
  | 'agent_deleted'
  | 'agent_suspended'
  | 'agent_activated'
  | 'credential_created'
  | 'credential_revoked'
  | 'credential_rotated'
  | 'scope_modified'
  | 'capability_added'
  | 'capability_removed'
  | 'certification_granted'
  | 'certification_revoked'
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'action_executed'
  | 'action_denied'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'quota_exceeded';

export type AuditEventCategory = 'lifecycle' | 'security' | 'access' | 'configuration' | 'execution';

export interface AgentAuditLog {
  id: string;
  agentId: string;
  eventType: AuditEventType;
  eventCategory: AuditEventCategory;
  actorId?: string;
  actorType?: 'user' | 'system' | 'agent';
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================================================
// AGENT-2: Gateway Request/Response Types
// ============================================================================

export interface AgentRequest {
  agentId: string;
  operationMode?: OperationMode; // Defaults to agent's configured mode
  tenantId: string;
  projectId?: string;
  action: {
    type: ActionType;
    target?: string;
    payload?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export interface AgentResponse<T = unknown> {
  success: boolean;
  runId: string;
  operationMode: OperationMode;
  action: {
    id: string;
    type: ActionType;
    authorizationStatus: AuthorizationStatus;
    executed: boolean;
  };
  result?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  approval?: {
    id: string;
    status: ApprovalStatus;
    expiresAt: Date;
  };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Gateway Configuration
// ============================================================================

export interface GatewayConfig {
  // Operation mode enforcement
  forceSimulationMode: boolean; // Force all agents to SIMULATION
  defaultOperationMode: OperationMode;
  allowModeOverride: boolean;

  // Rate limiting
  globalRateLimitPerHour: number;
  globalRateLimitPerDay: number;

  // Risk management
  autoApproveBelow: RiskLevel; // Auto-approve actions below this level
  requireApprovalAbove: RiskLevel; // Require approval above this level
  blockAbove?: RiskLevel; // Block actions above this level (optional)

  // Approval settings
  defaultApprovalExpiryMinutes: number;
  defaultApprovalAssignees: string[];

  // Observability
  enableDetailedLogging: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;

  // Safety
  enableSafetyChecks: boolean;
  enableCrossTenantBlocking: boolean;
  enableQuotaEnforcement: boolean;
}

// ============================================================================
// CLI & Orchestrator Integration (AGENT-6)
// ============================================================================

export interface CLICommandRequest {
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
}

export interface CLICommandResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface PipelineRequest {
  pipelineId: string;
  parameters?: Record<string, unknown>;
  trigger: TriggerType;
}

export interface PipelineResponse {
  pipelineRunId: string;
  status: string;
  startedAt: Date;
}

export interface RunbookRequest {
  runbookId: string;
  parameters?: Record<string, unknown>;
  trigger: TriggerType;
}

export interface RunbookResponse {
  runId: string;
  status: string;
  startedAt: Date;
}

// ============================================================================
// Safety Scenarios (AGENT-10)
// ============================================================================

export interface SafetyScenario {
  id: string;
  name: string;
  description: string;
  category: 'cross_tenant' | 'rate_limit' | 'high_risk' | 'privilege_escalation' | 'data_exfiltration';
  severity: RiskLevel;
  testSteps: SafetyTestStep[];
  expectedOutcome: 'blocked' | 'requires_approval' | 'logged';
}

export interface SafetyTestStep {
  action: ActionType;
  target?: string;
  payload?: Record<string, unknown>;
  expectedResult: 'denied' | 'requires_approval' | 'rate_limited';
}

export interface SafetyTestResult {
  scenarioId: string;
  passed: boolean;
  actualOutcome: string;
  expectedOutcome: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// External Agent Onboarding (AGENT-15)
// ============================================================================

export interface AgentOnboardingRequest {
  name: string;
  description: string;
  agentType: AgentType;
  organizationId: string;
  requestedCapabilities: string[];
  requestedScopes: {
    tenantIds: string[];
    projectIds: string[];
  };
  ownerId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentOnboardingResponse {
  agentId: string;
  status: 'pending_certification' | 'certified' | 'rejected';
  certificationTests: CertificationTest[];
  message: string;
}

export interface CertificationTest {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'passed' | 'failed';
  requiredForCertification: boolean;
}

export interface CertificationResult {
  agentId: string;
  passed: boolean;
  testResults: Record<string, boolean>;
  certificationDate?: Date;
  expiresAt?: Date;
  issues: string[];
}
