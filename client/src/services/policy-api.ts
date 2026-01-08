/**
 * Policy Management API Client
 *
 * Frontend API client for policy CRUD, versioning, simulation,
 * and approval workflows.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module services/policy-api
 */

import { apiFetch, getAuthHeaders } from "./api";

// ============================================================================
// Types
// ============================================================================

export interface DataEnvelope<T> {
  data: T;
  meta: {
    source: string;
    timestamp: string;
    requestId: string;
    actor?: string;
    version?: string;
  };
  governance: GovernanceVerdict;
}

export interface GovernanceVerdict {
  result: "ALLOW" | "DENY" | "FLAG" | "REVIEW_REQUIRED";
  policyId: string;
  reason: string;
  evaluator: string;
  timestamp?: string;
}

export interface PolicyScope {
  stages: ("data" | "train" | "alignment" | "runtime")[];
  tenants: string[];
}

export interface PolicyRule {
  field: string;
  operator: "eq" | "neq" | "lt" | "gt" | "in" | "not_in" | "contains";
  value: unknown;
}

export interface ManagedPolicy {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: "access" | "data" | "export" | "retention" | "compliance" | "operational" | "safety";
  priority: number;
  scope: PolicyScope;
  rules: PolicyRule[];
  action: "ALLOW" | "DENY" | "ESCALATE" | "WARN";
  status: "draft" | "pending_approval" | "approved" | "active" | "deprecated" | "archived";
  version: number;
  tenantId: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  content: ManagedPolicy;
  changelog?: string;
  status: string;
  createdBy?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PolicyApprovalRequest {
  id: string;
  policyId: string;
  policyName: string;
  version: number;
  requestedBy?: string;
  requestedAt: string;
  reason?: string;
  changelog?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface CreatePolicyInput {
  name: string;
  displayName: string;
  description?: string;
  category: ManagedPolicy["category"];
  priority?: number;
  scope: PolicyScope;
  rules: PolicyRule[];
  action: ManagedPolicy["action"];
  effectiveFrom?: string;
  effectiveUntil?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePolicyInput {
  displayName?: string;
  description?: string;
  category?: ManagedPolicy["category"];
  priority?: number;
  scope?: PolicyScope;
  rules?: PolicyRule[];
  action?: ManagedPolicy["action"];
  effectiveFrom?: string;
  effectiveUntil?: string;
  metadata?: Record<string, unknown>;
  changelog?: string;
}

export interface PolicyListFilters {
  page?: number;
  pageSize?: number;
  status?: ManagedPolicy["status"];
  category?: ManagedPolicy["category"];
  search?: string;
}

export interface PolicyListResponse {
  policies: ManagedPolicy[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Simulation Types
export interface SimulationContext {
  stage: "data" | "train" | "alignment" | "runtime";
  tenantId: string;
  region?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  simulation?: boolean;
}

export interface SimulationRequest {
  policy: {
    id: string;
    description?: string;
    scope: PolicyScope;
    rules: PolicyRule[];
    action: ManagedPolicy["action"];
  };
  context: SimulationContext;
  compareWith?: {
    id: string;
    description?: string;
    scope: PolicyScope;
    rules: PolicyRule[];
    action: ManagedPolicy["action"];
  };
}

export interface MatchedRule {
  rule: PolicyRule;
  actualValue: unknown;
  matched: boolean;
  reason: string;
}

export interface EvaluationStep {
  step: number;
  description: string;
  result: "passed" | "failed" | "skipped";
  details?: Record<string, unknown>;
}

export interface PolicyDiff {
  addedRules: PolicyRule[];
  removedRules: PolicyRule[];
  modifiedRules: { before: PolicyRule; after: PolicyRule }[];
  scopeChanges: {
    stagesAdded: string[];
    stagesRemoved: string[];
    tenantsAdded: string[];
    tenantsRemoved: string[];
  };
  actionChanged: boolean;
  beforeAction?: string;
  afterAction?: string;
}

export interface SimulationVerdict {
  action: "ALLOW" | "DENY" | "ESCALATE" | "WARN";
  reasons: string[];
  policyIds: string[];
  metadata: {
    timestamp: string;
    evaluator: string;
    latencyMs: number;
    simulation: boolean;
  };
  provenance: {
    origin: string;
    confidence: number;
  };
}

export interface SimulationResult {
  verdict: SimulationVerdict;
  matchedRules: MatchedRule[];
  unmatchedRules: PolicyRule[];
  evaluationPath: EvaluationStep[];
  comparisonDiff?: PolicyDiff;
}

export interface BatchSimulationResult {
  totalContexts: number;
  allowCount: number;
  denyCount: number;
  escalateCount: number;
  warnCount: number;
  results: SimulationResult[];
}

export interface ImpactAnalysis {
  estimatedAffectedUsers: number;
  estimatedAffectedResources: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// API Client
// ============================================================================

const API_BASE = "/api/policies";

/**
 * Policy Management API
 */
export const PolicyManagementAPI = {
  /**
   * List policies with filters and pagination
   */
  async listPolicies(filters: PolicyListFilters = {}): Promise<DataEnvelope<PolicyListResponse>> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
    if (filters.status) params.set("status", filters.status);
    if (filters.category) params.set("category", filters.category);
    if (filters.search) params.set("search", filters.search);

    const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
    return apiFetch(url, { headers: getAuthHeaders() });
  },

  /**
   * Get a single policy by ID
   */
  async getPolicy(policyId: string): Promise<DataEnvelope<ManagedPolicy>> {
    return apiFetch(`${API_BASE}/${policyId}`, { headers: getAuthHeaders() });
  },

  /**
   * Create a new policy
   */
  async createPolicy(
    input: CreatePolicyInput
  ): Promise<DataEnvelope<{ success: boolean; policy: ManagedPolicy }>> {
    return apiFetch(API_BASE, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  /**
   * Update an existing policy
   */
  async updatePolicy(
    policyId: string,
    input: UpdatePolicyInput
  ): Promise<DataEnvelope<{ success: boolean; policy: ManagedPolicy }>> {
    return apiFetch(`${API_BASE}/${policyId}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  },

  /**
   * Delete (archive) a policy
   */
  async deletePolicy(policyId: string): Promise<DataEnvelope<{ success: boolean }>> {
    return apiFetch(`${API_BASE}/${policyId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  },

  /**
   * List policy versions
   */
  async listVersions(policyId: string): Promise<DataEnvelope<{ versions: PolicyVersion[] }>> {
    return apiFetch(`${API_BASE}/${policyId}/versions`, { headers: getAuthHeaders() });
  },

  /**
   * Rollback to a previous version
   */
  async rollbackPolicy(
    policyId: string,
    targetVersion: number
  ): Promise<DataEnvelope<{ success: boolean; policy: ManagedPolicy }>> {
    return apiFetch(`${API_BASE}/${policyId}/rollback`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ targetVersion }),
    });
  },

  /**
   * Submit policy for approval
   */
  async submitForApproval(
    policyId: string,
    reason?: string
  ): Promise<DataEnvelope<{ success: boolean; request: PolicyApprovalRequest }>> {
    return apiFetch(`${API_BASE}/${policyId}/submit`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Approve a policy
   */
  async approvePolicy(
    policyId: string,
    notes?: string
  ): Promise<DataEnvelope<{ success: boolean; policy: ManagedPolicy }>> {
    return apiFetch(`${API_BASE}/${policyId}/approve`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * Publish an approved policy
   */
  async publishPolicy(
    policyId: string
  ): Promise<DataEnvelope<{ success: boolean; policy: ManagedPolicy }>> {
    return apiFetch(`${API_BASE}/${policyId}/publish`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  },
};

/**
 * Policy Simulator API
 */
export const PolicySimulatorAPI = {
  /**
   * Simulate a policy against a context
   */
  async simulate(request: SimulationRequest): Promise<DataEnvelope<SimulationResult>> {
    return apiFetch(`${API_BASE}/simulate`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },

  /**
   * Batch simulate against multiple contexts
   */
  async batchSimulate(
    policy: SimulationRequest["policy"],
    contexts: SimulationContext[]
  ): Promise<DataEnvelope<BatchSimulationResult>> {
    return apiFetch(`${API_BASE}/simulate/batch`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ policy, contexts }),
    });
  },

  /**
   * Analyze impact of a policy change
   */
  async analyzeImpact(
    currentPolicy: SimulationRequest["policy"],
    newPolicy: SimulationRequest["policy"]
  ): Promise<DataEnvelope<ImpactAnalysis>> {
    return apiFetch(`${API_BASE}/analyze-impact`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ currentPolicy, newPolicy }),
    });
  },
};

/**
 * Combined Policy API
 */
export const PolicyAPI = {
  ...PolicyManagementAPI,
  simulator: PolicySimulatorAPI,
};

export default PolicyAPI;
