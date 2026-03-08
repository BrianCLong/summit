"use strict";
/**
 * Compliance Client
 *
 * Client for compliance management operations including
 * assessments, controls, evidence, and reporting.
 *
 * @module @summit/sdk
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceClient = void 0;
// ============================================================================
// Compliance Client Implementation
// ============================================================================
class ComplianceClient {
    client;
    basePath = '/api/v1/compliance';
    constructor(client) {
        this.client = client;
    }
    // --------------------------------------------------------------------------
    // Controls
    // --------------------------------------------------------------------------
    /**
     * List compliance controls
     */
    async listControls(options = {}) {
        const response = await this.client.get(`${this.basePath}/controls`, options);
        return response.data;
    }
    /**
     * Get a single control
     */
    async getControl(id) {
        const response = await this.client.get(`${this.basePath}/controls/${id}`);
        return response.data;
    }
    /**
     * Update control status
     */
    async updateControlStatus(id, status, notes) {
        const response = await this.client.patch(`${this.basePath}/controls/${id}`, {
            status,
            implementationNotes: notes,
        });
        return response.data;
    }
    /**
     * Assign control to user
     */
    async assignControl(id, userId, dueDate) {
        const response = await this.client.post(`${this.basePath}/controls/${id}/assign`, {
            userId,
            dueDate,
        });
        return response.data;
    }
    /**
     * Get controls by framework
     */
    async getControlsByFramework(framework) {
        const response = await this.client.get(`${this.basePath}/frameworks/${framework}/controls`);
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Evidence
    // --------------------------------------------------------------------------
    /**
     * List evidence for a control
     */
    async listEvidence(controlId) {
        const response = await this.client.get(`${this.basePath}/controls/${controlId}/evidence`);
        return response.data;
    }
    /**
     * Add evidence to a control
     */
    async addEvidence(evidence) {
        const response = await this.client.post(`${this.basePath}/evidence`, evidence);
        return response.data;
    }
    /**
     * Get evidence by ID
     */
    async getEvidence(id) {
        const response = await this.client.get(`${this.basePath}/evidence/${id}`);
        return response.data;
    }
    /**
     * Delete evidence
     */
    async deleteEvidence(id) {
        await this.client.delete(`${this.basePath}/evidence/${id}`);
    }
    /**
     * Verify evidence
     */
    async verifyEvidence(id, status, notes) {
        const response = await this.client.post(`${this.basePath}/evidence/${id}/verify`, {
            status,
            notes,
        });
        return response.data;
    }
    /**
     * Get expiring evidence
     */
    async getExpiringEvidence(daysAhead = 30) {
        const response = await this.client.get(`${this.basePath}/evidence/expiring`, {
            daysAhead,
        });
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Assessments
    // --------------------------------------------------------------------------
    /**
     * List assessments
     */
    async listAssessments(options = {}) {
        const response = await this.client.get(`${this.basePath}/assessments`, options);
        return response.data;
    }
    /**
     * Get assessment by ID
     */
    async getAssessment(id) {
        const response = await this.client.get(`${this.basePath}/assessments/${id}`);
        return response.data;
    }
    /**
     * Start a new assessment
     */
    async startAssessment(request) {
        const response = await this.client.post(`${this.basePath}/assessments`, request);
        return response.data;
    }
    /**
     * Complete an assessment
     */
    async completeAssessment(id) {
        const response = await this.client.post(`${this.basePath}/assessments/${id}/complete`);
        return response.data;
    }
    /**
     * Add finding to assessment
     */
    async addFinding(assessmentId, finding) {
        const response = await this.client.post(`${this.basePath}/assessments/${assessmentId}/findings`, finding);
        return response.data;
    }
    /**
     * Update finding status
     */
    async updateFindingStatus(assessmentId, findingId, status) {
        const response = await this.client.patch(`${this.basePath}/assessments/${assessmentId}/findings/${findingId}`, { status });
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Gap Analysis
    // --------------------------------------------------------------------------
    /**
     * Perform gap analysis
     */
    async performGapAnalysis(framework) {
        const response = await this.client.post(`${this.basePath}/gap-analysis`, { framework });
        return response.data;
    }
    /**
     * Get latest gap analysis
     */
    async getGapAnalysis(framework) {
        try {
            const response = await this.client.get(`${this.basePath}/frameworks/${framework}/gap-analysis`);
            return response.data;
        }
        catch (error) {
            if (error.status === 404) {
                return null;
            }
            throw error;
        }
    }
    // --------------------------------------------------------------------------
    // Remediation
    // --------------------------------------------------------------------------
    /**
     * Create remediation plan
     */
    async createRemediationPlan(findingId, plan) {
        const response = await this.client.post(`${this.basePath}/remediations`, {
            ...plan,
            findingId,
        });
        return response.data;
    }
    /**
     * Get remediation plan
     */
    async getRemediationPlan(id) {
        const response = await this.client.get(`${this.basePath}/remediations/${id}`);
        return response.data;
    }
    /**
     * Update remediation plan
     */
    async updateRemediationPlan(id, updates) {
        const response = await this.client.patch(`${this.basePath}/remediations/${id}`, updates);
        return response.data;
    }
    /**
     * Complete remediation step
     */
    async completeRemediationStep(planId, stepId) {
        const response = await this.client.post(`${this.basePath}/remediations/${planId}/steps/${stepId}/complete`);
        return response.data;
    }
    /**
     * List remediation plans for a finding
     */
    async listRemediationPlans(findingId) {
        const response = await this.client.get(`${this.basePath}/findings/${findingId}/remediations`);
        return response.data;
    }
    // --------------------------------------------------------------------------
    // Reporting
    // --------------------------------------------------------------------------
    /**
     * Generate compliance report
     */
    async generateReport(request) {
        const response = await this.client.post(`${this.basePath}/reports`, request);
        return response.data;
    }
    /**
     * List reports
     */
    async listReports(framework) {
        const response = await this.client.get(`${this.basePath}/reports`, { framework });
        return response.data;
    }
    /**
     * Get report by ID
     */
    async getReport(id) {
        const response = await this.client.get(`${this.basePath}/reports/${id}`);
        return response.data;
    }
    /**
     * Download report
     */
    async downloadReport(id) {
        const report = await this.getReport(id);
        const response = await fetch(report.downloadUrl);
        return response.blob();
    }
    // --------------------------------------------------------------------------
    // Summary & Analytics
    // --------------------------------------------------------------------------
    /**
     * Get compliance summary
     */
    async getSummary(framework) {
        const response = await this.client.get(`${this.basePath}/summary`, { framework });
        return response.data;
    }
    /**
     * Get compliance trends
     */
    async getTrends(framework, period) {
        const response = await this.client.get(`${this.basePath}/frameworks/${framework}/trends`, { period });
        return response.data;
    }
    /**
     * Get framework maturity
     */
    async getMaturity(framework) {
        const response = await this.client.get(`${this.basePath}/frameworks/${framework}/maturity`);
        return response.data;
    }
}
exports.ComplianceClient = ComplianceClient;
