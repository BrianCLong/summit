/**
 * Policy Client
 *
 * Client for policy management operations including
 * CRUD, evaluation, simulation, and version control.
 *
 * @module @summit/sdk
 */

/* eslint-disable require-await */
import type { SummitClient, PaginatedResponse } from "./SummitClient.js";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Policy status
 */
export type PolicyStatus = "draft" | "active" | "archived" | "deprecated";

/**
 * Policy effect
 */
export type PolicyEffect = "allow" | "deny" | "audit";

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  version: number;
  status: PolicyStatus;
  effect: PolicyEffect;
  rules: PolicyRule[];
  conditions: PolicyCondition[];
  priority: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/**
 * Policy rule
 */
export interface PolicyRule {
  id: string;
  name: string;
  resource: string;
  actions: string[];
  subjects: string[];
  conditions?: PolicyCondition[];
}

/**
 * Policy condition
 */
export interface PolicyCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "contains" | "matches";
  value: unknown;
}

/**
 * Policy evaluation request
 */
export interface EvaluationRequest {
  subject: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  resource: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  action: string;
  context?: Record<string, unknown>;
}

/**
 * Policy evaluation result
 */
export interface EvaluationResult {
  allowed: boolean;
  effect: PolicyEffect;
  matchedPolicies: string[];
  evaluatedPolicies: number;
  evaluationTimeMs: number;
  reason: string;
  governanceVerdict: {
    result: "ALLOW" | "DENY" | "FLAG" | "REVIEW_REQUIRED";
    reason: string;
    riskScore: number;
  };
}

/**
 * Policy simulation request
 */
export interface SimulationRequest {
  policies: Array<{
    id?: string;
    definition: Partial<Policy>;
  }>;
  testCases: EvaluationRequest[];
  compareWithCurrent?: boolean;
}

/**
 * Policy simulation result
 */
export interface SimulationResult {
  testCases: Array<{
    request: EvaluationRequest;
    result: EvaluationResult;
    comparison?: {
      currentResult: EvaluationResult;
      changed: boolean;
      impact: "none" | "relaxed" | "restricted";
    };
  }>;
  summary: {
    totalTests: number;
    allowed: number;
    denied: number;
    changed: number;
  };
}

/**
 * Policy version
 */
export interface PolicyVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  changeDescription: string;
  policy: Policy;
}

/**
 * Create policy request
 */
export interface CreatePolicyRequest {
  name: string;
  description?: string;
  effect: PolicyEffect;
  rules: Omit<PolicyRule, "id">[];
  conditions?: PolicyCondition[];
  priority?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Update policy request
 */
export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  effect?: PolicyEffect;
  rules?: Omit<PolicyRule, "id">[];
  conditions?: PolicyCondition[];
  priority?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  changeDescription?: string;
}

/**
 * Policy list options
 */
export interface ListPoliciesOptions {
  page?: number;
  pageSize?: number;
  status?: PolicyStatus;
  effect?: PolicyEffect;
  search?: string;
  tags?: string[];
  sortBy?: "name" | "priority" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Policy Client Implementation
// ============================================================================

export class PolicyClient {
  private client: SummitClient;
  private basePath = "/api/v1/policies";

  constructor(client: SummitClient) {
    this.client = client;
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * List policies with pagination and filtering
   */
  public async list(options: ListPoliciesOptions = {}): Promise<PaginatedResponse<Policy>> {
    const response = await this.client.get<PaginatedResponse<Policy>>(this.basePath, {
      page: options.page,
      pageSize: options.pageSize,
      status: options.status,
      effect: options.effect,
      search: options.search,
      tags: options.tags?.join(","),
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    });
    return response.data;
  }

  /**
   * Get a single policy by ID
   */
  public async get(id: string): Promise<Policy> {
    const response = await this.client.get<Policy>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new policy
   */
  public async create(policy: CreatePolicyRequest): Promise<Policy> {
    const response = await this.client.post<Policy>(this.basePath, policy);
    return response.data;
  }

  /**
   * Update an existing policy
   */
  public async update(id: string, updates: UpdatePolicyRequest): Promise<Policy> {
    const response = await this.client.patch<Policy>(`${this.basePath}/${id}`, updates);
    return response.data;
  }

  /**
   * Delete a policy
   */
  public async delete(id: string): Promise<void> {
    await this.client.delete(`${this.basePath}/${id}`);
  }

  // --------------------------------------------------------------------------
  // Status Management
  // --------------------------------------------------------------------------

  /**
   * Activate a policy
   */
  public async activate(id: string): Promise<Policy> {
    const response = await this.client.post<Policy>(`${this.basePath}/${id}/activate`);
    return response.data;
  }

  /**
   * Archive a policy
   */
  public async archive(id: string): Promise<Policy> {
    const response = await this.client.post<Policy>(`${this.basePath}/${id}/archive`);
    return response.data;
  }

  /**
   * Deprecate a policy
   */
  public async deprecate(id: string, reason: string): Promise<Policy> {
    const response = await this.client.post<Policy>(`${this.basePath}/${id}/deprecate`, { reason });
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Evaluation
  // --------------------------------------------------------------------------

  /**
   * Evaluate a policy decision
   */
  public async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    const response = await this.client.post<EvaluationResult>(`${this.basePath}/evaluate`, request);
    return response.data;
  }

  /**
   * Batch evaluate multiple requests
   */
  public async batchEvaluate(requests: EvaluationRequest[]): Promise<EvaluationResult[]> {
    const response = await this.client.post<EvaluationResult[]>(`${this.basePath}/evaluate/batch`, {
      requests,
    });
    return response.data;
  }

  /**
   * Check if action is allowed (simplified evaluation)
   */
  public async isAllowed(subjectId: string, resourceId: string, action: string): Promise<boolean> {
    const result = await this.evaluate({
      subject: { id: subjectId, type: "user", attributes: {} },
      resource: { id: resourceId, type: "resource", attributes: {} },
      action,
    });
    return result.allowed;
  }

  // --------------------------------------------------------------------------
  // Simulation
  // --------------------------------------------------------------------------

  /**
   * Simulate policy changes
   */
  public async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const response = await this.client.post<SimulationResult>(`${this.basePath}/simulate`, request);
    return response.data;
  }

  /**
   * What-if analysis for a policy change
   */
  public async whatIf(
    policyId: string,
    changes: UpdatePolicyRequest,
    testCases: EvaluationRequest[]
  ): Promise<SimulationResult> {
    return this.simulate({
      policies: [{ id: policyId, definition: changes }],
      testCases,
      compareWithCurrent: true,
    });
  }

  // --------------------------------------------------------------------------
  // Version Control
  // --------------------------------------------------------------------------

  /**
   * Get version history for a policy
   */
  public async getVersions(id: string): Promise<PolicyVersion[]> {
    const response = await this.client.get<PolicyVersion[]>(`${this.basePath}/${id}/versions`);
    return response.data;
  }

  /**
   * Get a specific version of a policy
   */
  public async getVersion(id: string, version: number): Promise<PolicyVersion> {
    const response = await this.client.get<PolicyVersion>(
      `${this.basePath}/${id}/versions/${version}`
    );
    return response.data;
  }

  /**
   * Rollback to a previous version
   */
  public async rollback(id: string, version: number): Promise<Policy> {
    const response = await this.client.post<Policy>(`${this.basePath}/${id}/rollback`, { version });
    return response.data;
  }

  /**
   * Compare two versions
   */
  public async compareVersions(
    id: string,
    version1: number,
    version2: number
  ): Promise<{
    added: string[];
    removed: string[];
    changed: Array<{ field: string; old: unknown; new: unknown }>;
  }> {
    const response = await this.client.get(`${this.basePath}/${id}/versions/compare`, {
      v1: version1,
      v2: version2,
    });
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Import policies from JSON
   */
  public async import(policies: CreatePolicyRequest[]): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const response = await this.client.post(`${this.basePath}/import`, { policies });
    return response.data;
  }

  /**
   * Export policies to JSON
   */
  public async export(options: { status?: PolicyStatus; tags?: string[] } = {}): Promise<Policy[]> {
    const response = await this.client.get<Policy[]>(`${this.basePath}/export`, options);
    return response.data;
  }

  /**
   * Validate a policy definition
   */
  public async validate(policy: CreatePolicyRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const response = await this.client.post(`${this.basePath}/validate`, policy);
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Analytics
  // --------------------------------------------------------------------------

  /**
   * Get policy usage statistics
   */
  public async getStats(
    id: string,
    options: { from?: string; to?: string } = {}
  ): Promise<{
    evaluations: number;
    allowed: number;
    denied: number;
    avgEvaluationTimeMs: number;
    topSubjects: Array<{ id: string; count: number }>;
    topResources: Array<{ id: string; count: number }>;
  }> {
    const response = await this.client.get(`${this.basePath}/${id}/stats`, options);
    return response.data;
  }

  /**
   * Get recommendations for policy optimization
   */
  public async getRecommendations(id: string): Promise<{
    recommendations: Array<{
      type: "optimization" | "security" | "coverage";
      severity: "low" | "medium" | "high";
      message: string;
      suggestion: string;
    }>;
  }> {
    const response = await this.client.get(`${this.basePath}/${id}/recommendations`);
    return response.data;
  }
}
