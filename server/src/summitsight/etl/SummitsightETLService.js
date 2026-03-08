"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitsightETLService = void 0;
const SummitsightDataService_js_1 = require("../SummitsightDataService.js");
class SummitsightETLService {
    dataService;
    static instance;
    constructor() {
        this.dataService = new SummitsightDataService_js_1.SummitsightDataService();
    }
    static getInstance() {
        if (!SummitsightETLService.instance) {
            SummitsightETLService.instance = new SummitsightETLService();
        }
        return SummitsightETLService.instance;
    }
    /**
     * Ingests a run event (streaming or batch).
     */
    async ingestRun(data) {
        try {
            // Basic normalization or validation could happen here
            if (!data.tenant_id)
                throw new Error("Tenant ID required for ingestion");
            await this.dataService.recordRun(data);
        }
        catch (error) {
            console.error('Failed to ingest run:', error);
            // In prod, send to DLQ
        }
    }
    /**
     * Ingests a task event.
     */
    async ingestTask(data) {
        try {
            await this.dataService.recordTask(data);
        }
        catch (error) {
            console.error('Failed to ingest task:', error);
        }
    }
    /**
     * Ingests a security event.
     */
    async ingestSecurityEvent(data) {
        try {
            // Enrich with risk score if missing (simple heuristic)
            if (data.risk_score === undefined) {
                data.risk_score = this.calculateRiskScore(data.severity);
            }
            await this.dataService.recordSecurityEvent(data);
        }
        catch (error) {
            console.error('Failed to ingest security event:', error);
        }
    }
    /**
     * Ingests operational metrics (CI/CD, System).
     */
    async ingestOpsMetric(data) {
        try {
            await this.dataService.recordOpsMetric(data);
        }
        catch (error) {
            console.error('Failed to ingest ops metric:', error);
        }
    }
    // --- Helpers ---
    calculateRiskScore(severity) {
        switch (severity) {
            case 'critical': return 100;
            case 'high': return 75;
            case 'medium': return 50;
            case 'low': return 25;
            default: return 10;
        }
    }
    /**
     * Batch job to aggregate daily stats (Simulated ETL Job).
     * In a real system, this would be triggered by pg-boss or cron.
     */
    async runDailyAggregation(tenantId, date) {
        // This is a placeholder for where we would call logic to roll up
        // 5-minute buckets into hourly/daily Facts if we had high-volume data.
        // For now, we rely on on-demand aggregation in the Metrics Engine.
        return { status: 'skipped', reason: 'using_on_demand_agg' };
    }
}
exports.SummitsightETLService = SummitsightETLService;
