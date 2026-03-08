"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskEngine = void 0;
const SummitsightDataService_js_1 = require("../SummitsightDataService.js");
class RiskEngine {
    dataService;
    constructor() {
        this.dataService = new SummitsightDataService_js_1.SummitsightDataService();
    }
    /**
     * Runs a full risk assessment for a tenant.
     */
    async assessTenantRisk(tenantId) {
        const assessments = [];
        // 1. Auth Surface
        const authRisk = await this.assessAuthRisk(tenantId);
        assessments.push(authRisk);
        await this.dataService.saveRiskAssessment(authRisk);
        // 2. Data Export Surface (Simulated)
        const dataRisk = {
            tenant_id: tenantId,
            risk_category: 'data_export',
            risk_score: 20, // low
            factors: { recent_bulk_exports: 0 },
            assessed_at: new Date().toISOString()
        };
        assessments.push(dataRisk);
        await this.dataService.saveRiskAssessment(dataRisk);
        return assessments;
    }
    async assessAuthRisk(tenantId) {
        // Logic: Query FactSecurity for recent auth failures
        // For now, returning a calculated dummy object
        return {
            tenant_id: tenantId,
            risk_category: 'authentication',
            risk_score: 45, // Medium
            factors: {
                mfa_adoption: 'partial',
                failed_logins_last_24h: 12
            },
            assessed_at: new Date().toISOString()
        };
    }
}
exports.RiskEngine = RiskEngine;
