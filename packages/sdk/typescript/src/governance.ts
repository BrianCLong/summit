/**
 * Summit SDK Governance Module
 *
 * Governance and policy evaluation client.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Monitoring)
 *
 * @module @summit/sdk/governance
 */

import type {
  DataEnvelope,
  GovernanceRequest,
  GovernanceResult,
  Policy,
  PolicyRule,
  PolicySimulationRequest,
  PolicySimulationResult,
  PolicyStatus,
} from "./types.js";

/**
 * HTTP client interface for governance operations
 */
interface HttpClient {
  get<T>(path: string, params?: Record<string, string>): Promise<DataEnvelope<T>>;
  post<T>(path: string, body: unknown): Promise<DataEnvelope<T>>;
  put<T>(path: string, body: unknown): Promise<DataEnvelope<T>>;
  delete<T>(path: string): Promise<DataEnvelope<T>>;
}

/**
 * Governance client for policy management and evaluation
 */
export class GovernanceClient {
  private readonly http: HttpClient;

  constructor(httpClient: HttpClient) {
    this.http = httpClient;
  }

  // ==========================================================================
  // Policy Evaluation
  // ==========================================================================

  /**
   * Evaluate governance for an action
   *
   * @param request - Governance evaluation request
   * @returns Governance evaluation result
   *
   * @example
   * ```typescript
   * const result = await governance.evaluate({
   *   action: 'read',
   *   resource: { type: 'document', id: 'doc-123' },
   *   context: { sensitivityLevel: 'high' }
   * });
   *
   * if (result.data.verdict === 'ALLOW') {
   *   // Proceed with action
   * }
   * ```
   */
  async evaluate(request: GovernanceRequest): Promise<DataEnvelope<GovernanceResult>> {
    return this.http.post<GovernanceResult>("/governance/evaluate", request);
  }

  /**
   * Batch evaluate multiple governance requests
   *
   * @param requests - Array of governance requests
   * @returns Array of governance results
   */
  async evaluateBatch(requests: GovernanceRequest[]): Promise<DataEnvelope<GovernanceResult[]>> {
    return this.http.post<GovernanceResult[]>("/governance/evaluate/batch", { requests });
  }

  // ==========================================================================
  // Policy Management
  // ==========================================================================

  /**
   * List all policies
   *
   * @param status - Optional filter by policy status
   * @returns List of policies
   */
  async listPolicies(status?: PolicyStatus): Promise<DataEnvelope<Policy[]>> {
    const params = status ? { status } : undefined;
    return this.http.get<Policy[]>("/policies", params);
  }

  /**
   * Get a specific policy by ID
   *
   * @param policyId - Policy identifier
   * @returns Policy details
   */
  async getPolicy(policyId: string): Promise<DataEnvelope<Policy>> {
    return this.http.get<Policy>(`/policies/${policyId}`);
  }

  /**
   * Create a new policy
   *
   * @param policy - Policy definition
   * @returns Created policy
   *
   * @example
   * ```typescript
   * const policy = await governance.createPolicy({
   *   name: 'High Sensitivity Data Policy',
   *   description: 'Restrict access to high sensitivity data',
   *   rules: [
   *     {
   *       id: 'rule-1',
   *       condition: 'resource.sensitivity == "high" && !user.clearance.includes("top-secret")',
   *       action: 'deny',
   *       priority: 1
   *     }
   *   ]
   * });
   * ```
   */
  async createPolicy(
    policy: Omit<Policy, "id" | "version" | "status" | "createdAt" | "updatedAt">
  ): Promise<DataEnvelope<Policy>> {
    return this.http.post<Policy>("/policies", policy);
  }

  /**
   * Update an existing policy
   *
   * @param policyId - Policy identifier
   * @param updates - Policy updates
   * @returns Updated policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<Omit<Policy, "id" | "createdAt" | "updatedAt">>
  ): Promise<DataEnvelope<Policy>> {
    return this.http.put<Policy>(`/policies/${policyId}`, updates);
  }

  /**
   * Delete a policy
   *
   * @param policyId - Policy identifier
   * @returns Deletion confirmation
   */
  async deletePolicy(policyId: string): Promise<DataEnvelope<{ deleted: boolean }>> {
    return this.http.delete<{ deleted: boolean }>(`/policies/${policyId}`);
  }

  /**
   * Activate a policy
   *
   * @param policyId - Policy identifier
   * @returns Activated policy
   */
  async activatePolicy(policyId: string): Promise<DataEnvelope<Policy>> {
    return this.http.post<Policy>(`/policies/${policyId}/activate`, {});
  }

  /**
   * Archive a policy
   *
   * @param policyId - Policy identifier
   * @returns Archived policy
   */
  async archivePolicy(policyId: string): Promise<DataEnvelope<Policy>> {
    return this.http.post<Policy>(`/policies/${policyId}/archive`, {});
  }

  // ==========================================================================
  // Policy Simulation
  // ==========================================================================

  /**
   * Simulate policy evaluation without persisting
   *
   * @param request - Simulation request
   * @returns Simulation result
   *
   * @example
   * ```typescript
   * const simulation = await governance.simulate({
   *   policyId: 'policy-123',
   *   context: {
   *     user: { role: 'analyst', clearance: ['secret'] },
   *     time: new Date().toISOString()
   *   },
   *   resource: {
   *     type: 'document',
   *     attributes: { sensitivity: 'high' }
   *   }
   * });
   *
   * console.log('Verdict:', simulation.data.verdict);
   * console.log('Matched rules:', simulation.data.matchedRules);
   * ```
   */
  async simulate(request: PolicySimulationRequest): Promise<DataEnvelope<PolicySimulationResult>> {
    return this.http.post<PolicySimulationResult>("/policies/simulate", request);
  }

  /**
   * Test a set of rules without creating a policy
   *
   * @param rules - Rules to test
   * @param context - Test context
   * @param resource - Test resource
   * @returns Simulation result
   */
  async testRules(
    rules: PolicyRule[],
    context: Record<string, unknown>,
    resource: { type: string; id?: string; attributes?: Record<string, unknown> }
  ): Promise<DataEnvelope<PolicySimulationResult>> {
    return this.simulate({ rules, context, resource });
  }

  // ==========================================================================
  // Policy Versions
  // ==========================================================================

  /**
   * Get policy version history
   *
   * @param policyId - Policy identifier
   * @returns List of policy versions
   */
  async getPolicyVersions(
    policyId: string
  ): Promise<DataEnvelope<Array<Policy & { version: number }>>> {
    return this.http.get<Array<Policy & { version: number }>>(`/policies/${policyId}/versions`);
  }

  /**
   * Get a specific policy version
   *
   * @param policyId - Policy identifier
   * @param version - Version number
   * @returns Policy at specified version
   */
  async getPolicyVersion(policyId: string, version: number): Promise<DataEnvelope<Policy>> {
    return this.http.get<Policy>(`/policies/${policyId}/versions/${version}`);
  }

  /**
   * Rollback policy to a previous version
   *
   * @param policyId - Policy identifier
   * @param version - Version to rollback to
   * @returns Rolled back policy
   */
  async rollbackPolicy(policyId: string, version: number): Promise<DataEnvelope<Policy>> {
    return this.http.post<Policy>(`/policies/${policyId}/rollback`, { version });
  }

  // ==========================================================================
  // Policy Approval Workflow
  // ==========================================================================

  /**
   * Submit policy for approval
   *
   * @param policyId - Policy identifier
   * @param message - Approval request message
   * @returns Approval request details
   */
  async submitForApproval(
    policyId: string,
    message?: string
  ): Promise<DataEnvelope<{ approvalId: string; status: string }>> {
    return this.http.post<{ approvalId: string; status: string }>(
      `/policies/${policyId}/submit-for-approval`,
      { message }
    );
  }

  /**
   * Approve a policy
   *
   * @param approvalId - Approval request identifier
   * @param comment - Optional approval comment
   * @returns Approved policy
   */
  async approvePolicy(approvalId: string, comment?: string): Promise<DataEnvelope<Policy>> {
    return this.http.post<Policy>(`/policies/approvals/${approvalId}/approve`, {
      comment,
    });
  }

  /**
   * Reject a policy
   *
   * @param approvalId - Approval request identifier
   * @param reason - Rejection reason
   * @returns Rejection confirmation
   */
  async rejectPolicy(
    approvalId: string,
    reason: string
  ): Promise<DataEnvelope<{ rejected: boolean }>> {
    return this.http.post<{ rejected: boolean }>(`/policies/approvals/${approvalId}/reject`, {
      reason,
    });
  }

  /**
   * Get pending approvals
   *
   * @returns List of pending approval requests
   */
  async getPendingApprovals(): Promise<
    DataEnvelope<
      Array<{
        approvalId: string;
        policyId: string;
        policyName: string;
        submittedBy: string;
        submittedAt: string;
        message?: string;
      }>
    >
  > {
    return this.http.get("/policies/approvals/pending");
  }
}
