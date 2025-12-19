import express from 'express';
import { z } from 'zod';
import { disclosureExportService } from '../disclosure/export-service.js';
import { disclosureMetrics } from '../metrics/disclosureMetrics.js';
import {
  GovernanceBundleResult,
  generateGovernanceBundle,
} from '../governance/governance-bundle.js';

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

interface GovernanceBundleRecord {
  tenantId: string;
  createdAt: string;
  result: GovernanceBundleResult;
}

const governanceBundles = new Map<string, GovernanceBundleRecord>();

function resolveGovernanceBundle(bundleId: string) {
  return governanceBundles.get(bundleId);
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

router.post('/governance-bundle', async (req, res) => {
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

    const { startTime, endTime } = req.body ?? {};
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'invalid_time_window' });
    }

    const result = await generateGovernanceBundle({
      tenantId: effectiveTenant,
      startTime,
      endTime,
      auditLogPaths: req.body?.auditLogPaths,
      policyLogPaths: req.body?.policyLogPaths,
      sbomPaths: req.body?.sbomPaths,
      provenancePaths: req.body?.provenancePaths,
    });

    governanceBundles.set(result.id, {
      tenantId: effectiveTenant,
      createdAt: new Date().toISOString(),
      result,
    });

    return res.status(201).json({
      bundle: {
        id: result.id,
        sha256: result.sha256,
        warnings: result.warnings,
        counts: result.counts,
        downloadUrl: `/disclosures/governance-bundle/${result.id}/download`,
        manifestUrl: `/disclosures/governance-bundle/${result.id}/manifest`,
        checksumsUrl: `/disclosures/governance-bundle/${result.id}/checksums`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'governance_bundle_failed',
      details: error?.message,
    });
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

router.get('/governance-bundle/:bundleId/download', (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const record = resolveGovernanceBundle(req.params.bundleId);
  if (!record) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (record.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  return res.download(
    record.result.tarPath,
    `governance-bundle-${record.result.id}.tar.gz`,
  );
});

router.get('/governance-bundle/:bundleId/manifest', (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const record = resolveGovernanceBundle(req.params.bundleId);
  if (!record) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (record.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  return res.download(record.result.manifestPath, 'manifest.json');
});

router.get('/governance-bundle/:bundleId/checksums', (req, res) => {
  const tenantHeader = resolveTenant(req);
  if (!tenantHeader) {
    return res.status(400).json({ error: 'tenant_required' });
  }

  const record = resolveGovernanceBundle(req.params.bundleId);
  if (!record) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (record.tenantId !== tenantHeader) {
    return res.status(403).json({ error: 'tenant_mismatch' });
  }

  return res.download(record.result.checksumsPath, 'checksums.txt');
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
