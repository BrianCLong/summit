"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingService = exports.BillingService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const TenantCostService_js_1 = require("../services/TenantCostService.js");
const logger_js_1 = require("../config/logger.js");
const DatabaseService_js_1 = require("../services/DatabaseService.js");
const FraudService_js_1 = require("../services/FraudService.js");
class BillingService {
    adapter;
    db;
    secretKey;
    constructor(adapter) {
        this.adapter = adapter;
        this.db = new DatabaseService_js_1.DatabaseService();
        this.secretKey = process.env.BILLING_SIGNING_KEY || '';
        if (!this.secretKey && process.env.NODE_ENV === 'production') {
            throw new Error('BILLING_SIGNING_KEY is required in production');
        }
    }
    signReport(report) {
        const data = `${report.tenantId}:${report.periodStart.toISOString()}:${report.periodEnd.toISOString()}:${report.apiCalls}:${report.ingestEvents}:${report.egressGb}`;
        return crypto_1.default.createHmac('sha256', this.secretKey).update(data).digest('hex');
    }
    async generateAndExportReport(tenantId, date = new Date()) {
        // Check for active holds
        const isHoldActive = await FraudService_js_1.fraudService.isHoldActive('tenant', tenantId);
        if (isHoldActive) {
            logger_js_1.logger.warn({ tenantId }, 'Billing report generation paused due to active hold.');
            throw new Error('Billing operations paused for this tenant.');
        }
        // Calculate period (previous day 00:00 to 23:59)
        const periodStart = new Date(date);
        periodStart.setDate(periodStart.getDate() - 1);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(periodStart);
        periodEnd.setHours(23, 59, 59, 999);
        try {
            // Fetch usage data
            // For now, we approximate using tenantCostService or raw queries
            // In a real implementation, we would have precise counters.
            // We will mock the fetching for now as tenantCostService might not have granular fields
            // Fetch usage data from TenantCostService
            const metrics = await TenantCostService_js_1.tenantCostService.calculateTenantCosts(tenantId, 'day');
            // metrics.costs contains { total, compute, storage, network, apiCalls }
            // We map these to our report fields.
            // Note: In a real implementation, we would fetch raw counters from 'meters' table for accuracy.
            // Here we assume costs are proportional or we map them directly if they are actually counters.
            const reportWithoutSig = {
                tenantId,
                periodStart,
                periodEnd,
                apiCalls: metrics.costs.apiCalls || 0,
                ingestEvents: 0, // Not currently tracked in TenantCostService, defaulting to 0
                egressGb: metrics.costs.network || 0,
                plan: 'standard', // This should ideally be fetched from a TenantService
                quotaOverrides: '{}'
            };
            const signature = this.signReport(reportWithoutSig);
            const report = { ...reportWithoutSig, signature };
            await this.adapter.exportUsage(report);
            return report;
        }
        catch (error) {
            logger_js_1.logger.error({ err: error, tenantId }, 'Failed to generate billing report');
            throw error;
        }
    }
    async reconcile(tenantId, date) {
        const periodStart = new Date(date);
        periodStart.setDate(periodStart.getDate() - 1);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(periodStart);
        periodEnd.setHours(23, 59, 59, 999);
        const exportedReport = await this.adapter.getBilledUsage(tenantId, periodStart, periodEnd);
        if (!exportedReport) {
            logger_js_1.logger.warn({ tenantId, date }, 'No exported report found for reconciliation');
            return { variance: 0, alert: true };
        }
        // Re-calculate current usage
        // In a real system, "current" might change if late events arrive.
        // This checks if our current view matches what was billed.
        // For this prototype, we'll just check if the signature is valid
        const recomputedSig = this.signReport(exportedReport);
        if (recomputedSig !== exportedReport.signature) {
            logger_js_1.logger.error({ tenantId }, 'Billing signature mismatch!');
            return { variance: 100, alert: true };
        }
        return { variance: 0, alert: false };
    }
}
exports.BillingService = BillingService;
// Singleton export
const FileBillingAdapter_js_1 = require("./adapters/FileBillingAdapter.js");
exports.billingService = new BillingService(new FileBillingAdapter_js_1.FileBillingAdapter());
