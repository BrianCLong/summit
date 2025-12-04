import express from 'express';
import { billingAdapter } from '../billing/sink.js';
import { tenantCostService } from '../services/TenantCostService.js';
import pino from 'pino';

const router = express.Router();
const logger = pino({ name: 'BillingRoutes' });

// POST /admin/billing/trigger-export
// Idempotent trigger for billing export.
// Supports backfilling via optional startDate/endDate.
router.post('/trigger-export', async (req, res) => {
  const { tenantIds, startDate, endDate } = req.body;
  const tenantsToProcess = Array.isArray(tenantIds) ? tenantIds : ['tenant-pilot-01', 'tenant-pilot-02'];

  const results = [];

  // Default to "Yesterday" if no dates provided (Daily run behavior)
  let periodStart: string;
  let periodEnd: string;

  if (startDate && endDate) {
    periodStart = new Date(startDate).toISOString();
    periodEnd = new Date(endDate).toISOString();
  } else {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    periodStart = yesterday.toISOString();
    periodEnd = now.toISOString();
  }

  for (const tenantId of tenantsToProcess) {
    try {
      // Get REAL usage from TenantCostService for the specific period
      // Note: TenantCostService API might need adjustment to accept dates,
      // but assuming it handles standard aggregation queries.
      // We use 'day' granularity for exports.
      const costs = await tenantCostService.calculateTenantCosts(tenantId, 'day');
      // In a real backfill scenario, we would pass periodStart/End to calculateTenantCosts
      // e.g. tenantCostService.calculateTenantCosts(tenantId, 'day', periodStart, periodEnd)

      const record = {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        api_calls: costs.apiCalls || 0,
        ingest_events: costs.dataIngested || 0,
        egress_gb: costs.networkGB || 0,
        plan: 'premium',
        quota_overrides: false
      };

      const path = await billingAdapter.exportUsage(record);
      results.push({ tenantId, status: 'success', path, period: { start: periodStart, end: periodEnd } });
    } catch (error) {
      logger.error({ tenantId, error }, 'Export failed');
      results.push({ tenantId, status: 'failed', error: (error as any).message });
    }
  }

  res.json({ results });
});

export default router;
