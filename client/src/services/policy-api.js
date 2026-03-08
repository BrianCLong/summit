"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyAPI = exports.PolicySimulatorAPI = exports.PolicyManagementAPI = void 0;
const api_1 = require("./api");
// ============================================================================
// API Client
// ============================================================================
const API_BASE = '/api/policies';
/**
 * Policy Management API
 */
exports.PolicyManagementAPI = {
    /**
     * List policies with filters and pagination
     */
    async listPolicies(filters = {}) {
        const params = new URLSearchParams();
        if (filters.page)
            params.set('page', String(filters.page));
        if (filters.pageSize)
            params.set('pageSize', String(filters.pageSize));
        if (filters.status)
            params.set('status', filters.status);
        if (filters.category)
            params.set('category', filters.category);
        if (filters.search)
            params.set('search', filters.search);
        const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get a single policy by ID
     */
    async getPolicy(policyId) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}`, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Create a new policy
     */
    async createPolicy(input) {
        return (0, api_1.apiFetch)(API_BASE, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
    },
    /**
     * Update an existing policy
     */
    async updatePolicy(policyId, input) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}`, {
            method: 'PATCH',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
    },
    /**
     * Delete (archive) a policy
     */
    async deletePolicy(policyId) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}`, {
            method: 'DELETE',
            headers: (0, api_1.getAuthHeaders)(),
        });
    },
    /**
     * List policy versions
     */
    async listVersions(policyId) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}/versions`, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Rollback to a previous version
     */
    async rollbackPolicy(policyId, targetVersion) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}/rollback`, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetVersion }),
        });
    },
    /**
     * Submit policy for approval
     */
    async submitForApproval(policyId, reason) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}/submit`, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
    },
    /**
     * Approve a policy
     */
    async approvePolicy(policyId, notes) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}/approve`, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
        });
    },
    /**
     * Publish an approved policy
     */
    async publishPolicy(policyId) {
        return (0, api_1.apiFetch)(`${API_BASE}/${policyId}/publish`, {
            method: 'POST',
            headers: (0, api_1.getAuthHeaders)(),
        });
    },
};
/**
 * Policy Simulator API
 */
exports.PolicySimulatorAPI = {
    /**
     * Simulate a policy against a context
     */
    async simulate(request) {
        return (0, api_1.apiFetch)(`${API_BASE}/simulate`, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
    },
    /**
     * Batch simulate against multiple contexts
     */
    async batchSimulate(policy, contexts) {
        return (0, api_1.apiFetch)(`${API_BASE}/simulate/batch`, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ policy, contexts }),
        });
    },
    /**
     * Analyze impact of a policy change
     */
    async analyzeImpact(currentPolicy, newPolicy) {
        return (0, api_1.apiFetch)(`${API_BASE}/analyze-impact`, {
            method: 'POST',
            headers: { ...(0, api_1.getAuthHeaders)(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPolicy, newPolicy }),
        });
    },
};
/**
 * Combined Policy API
 */
exports.PolicyAPI = {
    ...exports.PolicyManagementAPI,
    simulator: exports.PolicySimulatorAPI,
};
exports.default = exports.PolicyAPI;
