import { Router } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { ensurePolicy } from '../../middleware/abac.js';
import { finopsReportService } from '../../services/finops/FinopsReportService.js';
import logger from '../../utils/logger.js';

const router = Router({ mergeParams: true });
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

const BillingExportQuery = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

function attachTenantToBody(req: any, _res: any, next: any) {
  req.body = { ...req.body, tenantId: singleParam(req.params.tenantId) };
  return next();
}

function ensureTenantScope(req: any, res: any, next: any) {
  const tenantId = singleParam(req.params.tenantId);
  const userTenant = req.user?.tenantId || req.user?.tenant_id;
  const isSuper = ['SUPER_ADMIN', 'ADMIN', 'admin'].includes(req.user?.role);
  if (!isSuper && userTenant && userTenant !== tenantId) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  return next();
}

router.get(
  '/report',
  ensureAuthenticated,
  ensureTenantScope,
  attachTenantToBody,
  ensurePolicy('read', 'tenant'),
  async (req, res) => {
    try {
      const { start, end, format } = BillingExportQuery.parse(req.query);
      const tenantId = singleParam(req.params.tenantId);

      const report = await finopsReportService.buildReport(tenantId, start, end);

      if (format === 'csv') {
        const csv = finopsReportService.toCsv(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="tenant-${tenantId}-billing.csv"`,
        );
        return res.send(csv);
      }

      return res.json({ success: true, data: report });
    } catch (error: any) {
      logger.error({ error }, 'Failed to export tenant billing report');
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

export default router;
