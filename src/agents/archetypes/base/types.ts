/**
 * Agent Archetypes - Core Type Definitions
 *
 * Defines the interfaces and types for Summit's named agent archetypes.
 */

export type AgentRole = 'chief_of_staff' | 'coo' | 'revops' | 'cfo' | 'ciso' | 'people_ops' | 'custom';

export type AgentMode = 'analysis' | 'recommendation' | 'action' | 'monitor';

export type AgentStatus = 'initializing' | 'ready' | 'busy' | 'error' | 'offline';

export type ClassificationLevel = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET' | 'SCI' | 'SAP';

/**
 * User context for agent operations
 */
export interface AgentUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/**
 * Organization context for agent operations
 */
export interface AgentOrganization {
  id: string;
  name: string;
  policies: PolicySet;
  graphHandle: GraphHandle;
}

/**
 * Policy set for organization
 */
export interface PolicySet {
  id: string;
  version: string;
  rules: PolicyRule[];
}

/**
 * Individual policy rule
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  conditions: Record<string, any>;
}

/**
 * Graph handle for querying/mutating graph entities
 */
export interface GraphHandle {
  query(cypher: string, params?: Record<string, any>): Promise<any[]>;
  mutate(cypher: string, params?: Record<string, any>): Promise<any>;
  getEntity(id: string): Promise<GraphEntity | null>;
  createEntity(type: string, properties: Record<string, any>): Promise<GraphEntity>;
  updateEntity(id: string, properties: Record<string, any>): Promise<GraphEntity>;
  deleteEntity(id: string): Promise<boolean>;
}

/**
 * Graph entity representation
 */
export interface GraphEntity {
  id: string;
  type: string;
  properties: Record<string, any>;
  relationships: GraphRelationship[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Graph relationship
 */
export interface GraphRelationship {
  id: string;
  type: string;
  from: string;
  to: string;
  properties: Record<string, any>;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  user: AgentUser;
  organization: AgentOrganization;
  mode: AgentMode;
  timestamp: Date;
  requestId: string;
  classification: ClassificationLevel;
  metadata?: Record<string, any>;
}

/**
 * Query for agent analysis
 */
export interface AgentQuery {
  type: string;
  parameters: Record<string, any>;
  filters?: Record<string, any>;
  timeframe?: {
    start: Date;
    end: Date;
  };
}

/**
 * Agent analysis result
 */
export interface AgentAnalysis {
  queryId: string;
  timestamp: Date;
  findings: Finding[];
  insights: Insight[];
  recommendations: AgentRecommendation[];
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Finding from analysis
 */
export interface Finding {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: any[];
  impact?: string;
}

/**
 * Insight from analysis
 */
export interface Insight {
  id: string;
  category: string;
  summary: string;
  details: string;
  confidence: number;
  supporting_data?: any[];
}

/**
 * Agent recommendation
 */
export interface AgentRecommendation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedImpact?: string;
  estimatedEffort?: string;
  requiredApprovals?: string[];
  action?: {
    type: string;
    parameters: Record<string, any>;
  };
}

/**
 * Agent action result
 */
export interface AgentAction {
  id: string;
  agentType: AgentRole;
  actionType: string;
  parameters: Record<string, any>;
  policyResult: PolicyResult;
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  result?: any;
  error?: string;
  timestamp: Date;
}

/**
 * Policy evaluation result
 */
export interface PolicyResult {
  allowed: boolean;
  policy: string;
  reason?: string;
  required_approvals?: string[];
}

/**
 * Audit record for agent actions
 */
export interface AuditRecord {
  id: string;
  timestamp: Date;
  requestId: string;
  agentType: AgentRole;
  agentInstanceId: string;
  action: string;
  input: any;
  output: any;
  policyResult: PolicyResult;
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  userId: string;
  organizationId: string;
  classification: ClassificationLevel;
  metadata?: Record<string, any>;
}

/**
 * Agent status information
 */
export interface AgentStatusInfo {
  status: AgentStatus;
  lastActive: Date;
  currentTask?: string;
  queuedTasks: number;
  metadata?: Record<string, any>;
}

/**
 * Agent metrics
 */
export interface AgentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  actionsExecuted: number;
  approvalsRequired: number;
  policyViolations: number;
  lastReset: Date;
}

/**
 * Agent health check result
 */
export interface AgentHealth {
  healthy: boolean;
  checks: {
    graphConnection: boolean;
    policyEngine: boolean;
    approvalEngine: boolean;
    auditLog: boolean;
  };
  errors?: string[];
  lastCheck: Date;
}

/**
 * Agent result (final output)
 */
export interface AgentResult {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  recommendations?: AgentRecommendation[];
  actions?: AgentAction[];
  auditLogId?: string;
  metadata?: Record<string, any>;
}
