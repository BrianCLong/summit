import express from 'express';
import { z } from 'zod';
import { disclosureExportService } from '../disclosure/export-service.js';
import { disclosureMetrics } from '../metrics/disclosureMetrics.js';

const router = express.Router();
router.use(express.json());

const analyticsSchema = z.object({
  event: z.enum(['view', 'start']),
  tenantId: z.string().min(1),
  context: z.record(z.any()).optional(),
});

function resolveTenant(req: express.Request): string | undefined {
  const header = (req.headers['x-tenant-id'] as string | undefined)?.trim();
  const requestTenant = (req as any).tenantId as string | undefined;
  return header || requestTenant;
}

router.post('/analytics', (req, res) => {
  try {
    const payload = analyticsSchema.parse(req.body ?? {});
    const tenantHeader = resolveTenant(req) ?? payload.tenantId;
    if (tenantHeader !== payload.tenantId) {
      return res.status(403).json({ error: 'tenant_mismatch' });
    }
    disclosureMetrics.uiEvent(payload.event, tenantHeader);
    return res.status(202).json({ ok: true });
  } catch (error: any) {
    return res
      .status(400)
      .json({ error: 'invalid_payload', details: error?.message });
  }
});

router.post('/export', async (req, res) => {
  try {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const bodyTenant = req.body?.tenantId;
    const effectiveTenant = bodyTenant ?? tenantHeader;
    if (effectiveTenant !== tenantHeader) {
      return res.status(403).json({ error: 'tenant_mismatch' });
    }

    const job = await disclosureExportService.createJob({
      ...req.body,
      tenantId: effectiveTenant,
    });

    return res.status(202).json({ job });
  } catch (error: any) {
    const status =
      error?.message === 'window_too_large' ||
      error?.message === 'end_before_start'
        ? 400
        : 500;
    return res
      .status(status)
      .json({ error: error?.message || 'export_failed' });
  }
});

router.get('/export', (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }
  const jobs = disclosureExportService.listJobsForTenant(tenantHeader);
  return res.json({ jobs });
});

router.get('/export/:jobId', (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const job = disclosureExportService.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (job.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  return res.json({ job });
});

router.get('/export/:jobId/download', (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const download = disclosureExportService.getDownload(req.params.jobId);
  if (!download) {
    return res.status(404).json({ error: 'not_ready' });
  }

  if (download.job.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  if (download.job.status !== 'completed') {
    return res
      .status(409)
      .json({ error: 'not_completed', status: download.job.status });
  }

  return res.download(download.filePath, `disclosure-${download.job.id}.zip`);
});

export default router;
