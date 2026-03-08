"use strict";
/**
 * Policy Client
 *
 * Client for policy management operations including
 * CRUD, evaluation, simulation, and version control.
 *
 * @module @summit/sdk
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyClient = void 0;
// ============================================================================
// Policy Client Implementation
// ============================================================================
class PolicyClient {
    client;
    basePath = '/api/v1/policies';
    constructor(client) {
        this.client = client;
    }
    // --------------------------------------------------------------------------
    // CRUD Operations
    // --------------------------------------------------------------------------
    /**
     * List policies with pagination and filtering
     */
    async list(options = {}) {
        const response = await this.client.get(this.basePath, {
            page: options.page,
            pageSize: options.pageSize,
            status: options.status,
            effect: options.effect,
            search: options.search,
            tags: options.tags?.join(','),
            sortBy: options.sortBy,
            sortOrder: options.sortOrder,
        });
        return response.data;
    }
    /**
     * Get a single policy by ID
     */
    async get(id) {
        const response = await this.client.get(`${this.basePath}/${id}`);
        return response.data;
    }
    /**
     * Create a new policy
     */
    async create(policy) {
        const response = await this.client.post(this.basePath, policy);
        return response.data;
    }
    /**
     * Update an existing policy
     */
    async update(id, updates) {
        const response = await this.client.patch(`${this.basePath}/${id}`, updates);
        return response.data;
    }
    /**
     * Delete a policy
     */
    async delete(id) {
        await this.client.delete(`${this.basePath}/${id}`);
    }
    // --------------------------------------------------------------------------
    // Status Management
    // --------------------------------------------------------------------------
    /**
     * Activate a policy
     */
    async activate(id) {
        const response = await this.client.post(`${this.basePath}/${id}/activate`);
        return response.data;
    }
    /**
     * Archive a policy
     */
    async archive(id) {
        const response = await this.client.post(`${this.basePath}/${id}/archive`);
        return response.data;
    }
    /**
     * Deprecate a policy
     */
    async deprecate(id, reason) {
        const response = await this.client.post(`${this.basePath}/${id}/deprecate`, { reason });
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Evaluation
    // --------------------------------------------------------------------------
    /**
     * Evaluate a policy decision
     */
    async evaluate(request) {
        const response = await this.client.post(`${this.basePath}/evaluate`, request);
        return response.data;
    }
    /**
     * Batch evaluate multiple requests
     */
    async batchEvaluate(requests) {
        const response = await this.client.post(`${this.basePath}/evaluate/batch`, { requests });
        return response.data;
    }
    /**
     * Check if action is allowed (simplified evaluation)
     */
    async isAllowed(subjectId, resourceId, action) {
        const result = await this.evaluate({
            subject: { id: subjectId, type: 'user', attributes: {} },
            resource: { id: resourceId, type: 'resource', attributes: {} },
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
    async simulate(request) {
        const response = await this.client.post(`${this.basePath}/simulate`, request);
        return response.data;
    }
    /**
     * What-if analysis for a policy change
     */
    async whatIf(policyId, changes, testCases) {
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
    async getVersions(id) {
        const response = await this.client.get(`${this.basePath}/${id}/versions`);
        return response.data;
    }
    /**
     * Get a specific version of a policy
     */
    async getVersion(id, version) {
        const response = await this.client.get(`${this.basePath}/${id}/versions/${version}`);
        return response.data;
    }
    /**
     * Rollback to a previous version
     */
    async rollback(id, version) {
        const response = await this.client.post(`${this.basePath}/${id}/rollback`, { version });
        return response.data;
    }
    /**
     * Compare two versions
     */
    async compareVersions(id, version1, version2) {
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
    async import(policies) {
        const response = await this.client.post(`${this.basePath}/import`, { policies });
        return response.data;
    }
    /**
     * Export policies to JSON
     */
    async export(options = {}) {
        const response = await this.client.get(`${this.basePath}/export`, options);
        return response.data;
    }
    /**
     * Validate a policy definition
     */
    async validate(policy) {
        const response = await this.client.post(`${this.basePath}/validate`, policy);
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Analytics
    // --------------------------------------------------------------------------
    /**
     * Get policy usage statistics
     */
    async getStats(id, options = {}) {
        const response = await this.client.get(`${this.basePath}/${id}/stats`, options);
        return response.data;
    }
    /**
     * Get recommendations for policy optimization
     */
    async getRecommendations(id) {
        const response = await this.client.get(`${this.basePath}/${id}/recommendations`);
        return response.data;
    }
}
exports.PolicyClient = PolicyClient;
