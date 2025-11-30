export type AgentStatus = 'DRAFT' | 'ACTIVE' | 'REVOKED' | 'DEPRECATED';

export type PolicyType = 'OPA_REGO' | 'MANUAL_APPROVAL' | 'THRESHOLD';

export interface AgentIdentity {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: string;
  capabilities: string[];
  complianceTags: string[];
  status: AgentStatus;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPolicy {
  id: string;
  agentId: string;
  name: string;
  policyType: PolicyType;
  configuration: Record<string, any>;
  isBlocking: boolean;
  createdAt: Date;
}

export interface AgentROIMetric {
  id: string;
  agentId: string;
  metricType: string;
  value: number;
  context?: Record<string, any>;
  recordedAt: Date;
}

export interface CreateAgentInput {
  name: string;
  tenantId: string;
  description?: string;
  capabilities?: string[];
  complianceTags?: string[];
  ownerId?: string;
}

export interface UpdateAgentInput {
  name?: string;
  status?: AgentStatus;
  capabilities?: string[];
  complianceTags?: string[];
}
