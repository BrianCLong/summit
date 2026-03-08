"use strict";
/**
 * Summit SDK Governance Module
 *
 * Governance and policy evaluation client.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Monitoring)
 *
 * @module @summit/sdk/governance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceClient = void 0;
/**
 * Governance client for policy management and evaluation
 */
class GovernanceClient {
    http;
    constructor(httpClient) {
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
    async evaluate(request) {
        return this.http.post('/governance/evaluate', request);
    }
    /**
     * Batch evaluate multiple governance requests
     *
     * @param requests - Array of governance requests
     * @returns Array of governance results
     */
    async evaluateBatch(requests) {
        return this.http.post('/governance/evaluate/batch', { requests });
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
    async listPolicies(status) {
        const params = status ? { status } : undefined;
        return this.http.get('/policies', params);
    }
    /**
     * Get a specific policy by ID
     *
     * @param policyId - Policy identifier
     * @returns Policy details
     */
    async getPolicy(policyId) {
        return this.http.get(`/policies/${policyId}`);
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
    async createPolicy(policy) {
        return this.http.post('/policies', policy);
    }
    /**
     * Update an existing policy
     *
     * @param policyId - Policy identifier
     * @param updates - Policy updates
     * @returns Updated policy
     */
    async updatePolicy(policyId, updates) {
        return this.http.put(`/policies/${policyId}`, updates);
    }
    /**
     * Delete a policy
     *
     * @param policyId - Policy identifier
     * @returns Deletion confirmation
     */
    async deletePolicy(policyId) {
        return this.http.delete(`/policies/${policyId}`);
    }
    /**
     * Activate a policy
     *
     * @param policyId - Policy identifier
     * @returns Activated policy
     */
    async activatePolicy(policyId) {
        return this.http.post(`/policies/${policyId}/activate`, {});
    }
    /**
     * Archive a policy
     *
     * @param policyId - Policy identifier
     * @returns Archived policy
     */
    async archivePolicy(policyId) {
        return this.http.post(`/policies/${policyId}/archive`, {});
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
    async simulate(request) {
        return this.http.post('/policies/simulate', request);
    }
    /**
     * Test a set of rules without creating a policy
     *
     * @param rules - Rules to test
     * @param context - Test context
     * @param resource - Test resource
     * @returns Simulation result
     */
    async testRules(rules, context, resource) {
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
    async getPolicyVersions(policyId) {
        return this.http.get(`/policies/${policyId}/versions`);
    }
    /**
     * Get a specific policy version
     *
     * @param policyId - Policy identifier
     * @param version - Version number
     * @returns Policy at specified version
     */
    async getPolicyVersion(policyId, version) {
        return this.http.get(`/policies/${policyId}/versions/${version}`);
    }
    /**
     * Rollback policy to a previous version
     *
     * @param policyId - Policy identifier
     * @param version - Version to rollback to
     * @returns Rolled back policy
     */
    async rollbackPolicy(policyId, version) {
        return this.http.post(`/policies/${policyId}/rollback`, { version });
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
    async submitForApproval(policyId, message) {
        return this.http.post(`/policies/${policyId}/submit-for-approval`, { message });
    }
    /**
     * Approve a policy
     *
     * @param approvalId - Approval request identifier
     * @param comment - Optional approval comment
     * @returns Approved policy
     */
    async approvePolicy(approvalId, comment) {
        return this.http.post(`/policies/approvals/${approvalId}/approve`, {
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
    async rejectPolicy(approvalId, reason) {
        return this.http.post(`/policies/approvals/${approvalId}/reject`, { reason });
    }
    /**
     * Get pending approvals
     *
     * @returns List of pending approval requests
     */
    async getPendingApprovals() {
        return this.http.get('/policies/approvals/pending');
    }
}
exports.GovernanceClient = GovernanceClient;
