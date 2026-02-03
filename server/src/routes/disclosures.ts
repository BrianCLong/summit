import express from 'express';
import { promises as fs } from 'fs';
import { z } from 'zod';
import { disclosureExportService } from '../disclosure/export-service.js';
import { disclosureMetrics } from '../metrics/disclosureMetrics.js';
import { runtimeEvidenceService } from '../disclosure/runtime-evidence.js';
import { ensureAuthenticated, requirePermission } from '../middleware/auth.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated);
router.use(requirePermission('export:investigations'));

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

router.post('/runtime-bundle', async (req, res) => {
  const tenantHeader = resolveTenant(req);
  const bodyTenant = req.body?.tenantId as string | undefined;

  if (!tenantHeader && !bodyTenant) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const effectiveTenant = bodyTenant ?? (tenantHeader as string);
  if (tenantHeader && tenantHeader !== effectiveTenant) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  try {
    const bundle = await runtimeEvidenceService.createBundle({
      tenantId: effectiveTenant,
      startTime: req.body?.startTime,
      endTime: req.body?.endTime,
      auditPaths: req.body?.auditPaths,
      policyPaths: req.body?.policyPaths,
      sbomPaths: req.body?.sbomPaths,
      provenancePaths: req.body?.provenancePaths,
      deployedVersion: req.body?.deployedVersion,
    });

    const base = `${req.protocol}://${req.get('host')}${req.baseUrl}/runtime-bundle/${bundle.id}`;
    const downloadUrl = `${base}/download`;
    const manifestUrl = `${base}/manifest`;
    const checksumsUrl = `${base}/checksums`;

    return res.status(201).json({
      bundle: {
        ...bundle,
        downloadUrl,
        manifestUrl,
        checksumsUrl,
      },
    });
  } catch (error: any) {
    const status = error?.message === 'invalid_date' ? 400 : 500;
    return res.status(status).json({
      error: 'runtime_bundle_failed',
      message: error?.message ?? 'unknown_error',
    });
  }
});

router.get('/runtime-bundle/:bundleId/download', async (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const bundle = runtimeEvidenceService.getBundle(req.params.bundleId);
  if (!bundle) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (bundle.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  const exists = await fs
    .access(bundle.bundlePath)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    return res.status(410).json({ error: 'bundle_missing' });
  }

  return res.download(bundle.bundlePath, `runtime-evidence-${bundle.id}.tar.gz`);
});

router.get('/runtime-bundle/:bundleId/manifest', async (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const bundle = runtimeEvidenceService.getBundle(req.params.bundleId);
  if (!bundle) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (bundle.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  const exists = await fs
    .access(bundle.manifestPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return res.status(410).json({ error: 'bundle_missing' });
  }

  return res.download(bundle.manifestPath, `runtime-evidence-${bundle.id}-manifest.json`);
});

router.get('/runtime-bundle/:bundleId/checksums', async (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const bundle = runtimeEvidenceService.getBundle(req.params.bundleId);
  if (!bundle) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (bundle.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  const exists = await fs
    .access(bundle.checksumsPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return res.status(410).json({ error: 'bundle_missing' });
  }

  return res.download(bundle.checksumsPath, `runtime-evidence-${bundle.id}-checksums.txt`);
});

export default router;
