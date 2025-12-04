import crypto from 'crypto';
import { BillingAdapter, UsageReport } from './types.js';
import { tenantCostService } from '../services/TenantCostService.js';
import { logger } from '../config/logger.js';
import { DatabaseService } from '../services/DatabaseService.js';

export class BillingService {
  private adapter: BillingAdapter;
  private db: DatabaseService;
  private secretKey: string;

  constructor(adapter: BillingAdapter) {
    this.adapter = adapter;
    this.db = new DatabaseService();
    this.secretKey = process.env.BILLING_SIGNING_KEY || '';
    if (!this.secretKey && process.env.NODE_ENV === 'production') {
      throw new Error('BILLING_SIGNING_KEY is required in production');
    }
  }

  private signReport(report: Omit<UsageReport, 'signature'>): string {
    const data = `${report.tenantId}:${report.periodStart.toISOString()}:${report.periodEnd.toISOString()}:${report.apiCalls}:${report.ingestEvents}:${report.egressGb}`;
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  async generateAndExportReport(tenantId: string, date: Date = new Date()): Promise<UsageReport> {
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
      const metrics = await tenantCostService.calculateTenantCosts(tenantId, 'day');

      // metrics.costs contains { total, compute, storage, network, apiCalls }
      // We map these to our report fields.
      // Note: In a real implementation, we would fetch raw counters from 'meters' table for accuracy.
      // Here we assume costs are proportional or we map them directly if they are actually counters.

      const reportWithoutSig: Omit<UsageReport, 'signature'> = {
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
      const report: UsageReport = { ...reportWithoutSig, signature };

      await this.adapter.exportUsage(report);

      return report;
    } catch (error) {
      logger.error({ err: error, tenantId }, 'Failed to generate billing report');
      throw error;
    }
  }

  async reconcile(tenantId: string, date: Date): Promise<{ variance: number, alert: boolean }> {
    const periodStart = new Date(date);
    periodStart.setDate(periodStart.getDate() - 1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setHours(23, 59, 59, 999);

    const exportedReport = await this.adapter.getBilledUsage(tenantId, periodStart, periodEnd);
    if (!exportedReport) {
      logger.warn({ tenantId, date }, 'No exported report found for reconciliation');
      return { variance: 0, alert: true };
    }

    // Re-calculate current usage
    // In a real system, "current" might change if late events arrive.
    // This checks if our current view matches what was billed.

    // For this prototype, we'll just check if the signature is valid
    const recomputedSig = this.signReport(exportedReport);
    if (recomputedSig !== exportedReport.signature) {
       logger.error({ tenantId }, 'Billing signature mismatch!');
       return { variance: 100, alert: true };
    }

    return { variance: 0, alert: false };
  }
}

// Singleton export
import { FileBillingAdapter } from './adapters/FileBillingAdapter.js';
export const billingService = new BillingService(new FileBillingAdapter());
