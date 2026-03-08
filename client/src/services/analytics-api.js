"use strict";
/**
 * Analytics API Client
 *
 * Frontend API client for governance and compliance analytics.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module services/analytics-api
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsAPI = exports.ComplianceMetricsAPI = exports.GovernanceMetricsAPI = void 0;
const api_1 = require("./api");
// ============================================================================
// Helper Functions
// ============================================================================
const buildTimeRangeParams = (timeRange) => {
    const params = new URLSearchParams();
    if (timeRange?.start)
        params.set('start', timeRange.start);
    if (timeRange?.end)
        params.set('end', timeRange.end);
    if (timeRange?.granularity)
        params.set('granularity', timeRange.granularity);
    return params.toString();
};
// ============================================================================
// API Clients
// ============================================================================
const GOVERNANCE_BASE = '/api/analytics/governance';
const COMPLIANCE_BASE = '/api/analytics/compliance';
/**
 * Governance Metrics API
 */
exports.GovernanceMetricsAPI = {
    /**
     * Get governance metrics summary
     */
    async getSummary(timeRange) {
        const params = buildTimeRangeParams(timeRange);
        const url = params ? `${GOVERNANCE_BASE}/summary?${params}` : `${GOVERNANCE_BASE}/summary`;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get verdict distribution
     */
    async getVerdictDistribution(timeRange) {
        const params = buildTimeRangeParams(timeRange);
        const url = params ? `${GOVERNANCE_BASE}/verdicts?${params}` : `${GOVERNANCE_BASE}/verdicts`;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get verdict trends over time
     */
    async getVerdictTrends(timeRange) {
        const params = buildTimeRangeParams(timeRange);
        const url = params ? `${GOVERNANCE_BASE}/trends?${params}` : `${GOVERNANCE_BASE}/trends`;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get policy effectiveness metrics
     */
    async getPolicyEffectiveness(timeRange, limit) {
        const params = new URLSearchParams();
        if (timeRange?.start)
            params.set('start', timeRange.start);
        if (timeRange?.end)
            params.set('end', timeRange.end);
        if (limit)
            params.set('limit', String(limit));
        const url = params.toString() ? `${GOVERNANCE_BASE}/policies?${params}` : `${GOVERNANCE_BASE}/policies`;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get detected anomalies
     */
    async getAnomalies(timeRange) {
        const params = buildTimeRangeParams(timeRange);
        const url = params ? `${GOVERNANCE_BASE}/anomalies?${params}` : `${GOVERNANCE_BASE}/anomalies`;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
};
/**
 * Compliance Metrics API
 */
exports.ComplianceMetricsAPI = {
    /**
     * Get compliance summary
     */
    async getSummary() {
        return (0, api_1.apiFetch)(`${COMPLIANCE_BASE}/summary`, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get audit readiness score
     */
    async getAuditReadiness() {
        return (0, api_1.apiFetch)(`${COMPLIANCE_BASE}/readiness`, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get control status
     */
    async getControlStatus(framework) {
        const url = framework
            ? `${COMPLIANCE_BASE}/controls?framework=${framework}`
            : `${COMPLIANCE_BASE}/controls`;
        return (0, api_1.apiFetch)(url, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get control effectiveness
     */
    async getControlEffectiveness() {
        return (0, api_1.apiFetch)(`${COMPLIANCE_BASE}/effectiveness`, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get evidence status
     */
    async getEvidenceStatus() {
        return (0, api_1.apiFetch)(`${COMPLIANCE_BASE}/evidence`, { headers: (0, api_1.getAuthHeaders)() });
    },
    /**
     * Get framework status
     */
    async getFrameworkStatus() {
        return (0, api_1.apiFetch)(`${COMPLIANCE_BASE}/frameworks`, { headers: (0, api_1.getAuthHeaders)() });
    },
};
/**
 * Combined Analytics API
 */
exports.AnalyticsAPI = {
    governance: exports.GovernanceMetricsAPI,
    compliance: exports.ComplianceMetricsAPI,
};
exports.default = exports.AnalyticsAPI;
