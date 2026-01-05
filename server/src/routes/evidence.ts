// @ts-nocheck
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { ensurePolicy } from '../middleware/abac.js';
import logger from '../utils/logger.js';
import { ProvenanceRepo } from '../repos/ProvenanceRepo.js';
import { getPostgresPool } from '../config/database.js';
import { tenantService } from '../services/TenantService.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { exportEvidencePayload } from '../provenance/evidenceExport.js';
import archiver from 'archiver';
import { createHash, randomUUID } from 'crypto';

const router = Router();

const exportRequestSchema = z.object({
  tenantId: z.string().uuid(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    tenantId?: string;
    role?: string;
  };
}

function buildReceipt(action: string, tenantId: string, actorId: string) {
  const issuedAt = new Date().toISOString();
  const payload = `${action}:${tenantId}:${actorId}:${issuedAt}`;
  const hash = createHash('sha256').update(payload).digest('hex');
  return {
    id: randomUUID(),
    action,
    tenantId,
    actorId,
    issuedAt,
    hash,
    policy: 'abac.ensurePolicy',
  };
}

/**
 * @route POST /api/evidence/exports
 * @desc Generate and download an evidence bundle for a tenant
 * @access Protected (Tenant Admin or Platform Admin)
 */
router.post(
  '/exports',
  ensureAuthenticated,
  ensurePolicy('read', 'evidence'), // Assuming 'evidence' resource exists in policy
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { tenantId, timeRange } = exportRequestSchema.parse(req.body);
      const actorId = authReq.user?.id || 'unknown';

      // Verify access to tenant
      const userTenantId = authReq.user?.tenantId;
      const isSuperAdmin = authReq.user?.role === 'SUPER_ADMIN';
      if (!isSuperAdmin && userTenantId !== tenantId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Fetch Tenant Config for Policy Bundle
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }

      // Fetch Audit Events
      const repo = new ProvenanceRepo(getPostgresPool());
      // ProvenanceRepo.by() doesn't support time range filtering directly in the current signature used in tenants.ts
      // But we can fetch and filter or update the repo. For now, we fetch recent events as a prototype.
      // Ideally we should update ProvenanceRepo to support time range.
      // Using `by` method signature: (purpose, tenantId, entityId, limit, offset, actorTenantId)
      const events = await repo.by('investigation', tenantId, undefined, 1000, 0, tenantId);

      const filteredEvents = events.filter((e: any) => {
          const t = new Date(e.created_at || e.createdAt).getTime();
          return t >= new Date(timeRange.start).getTime() && t <= new Date(timeRange.end).getTime();
      });

      const evidencePayload = await exportEvidencePayload(tenantId, {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      });

      // Start Stream
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="evidence-${tenantId}-${timeRange.start}.zip"`,
      );

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err: any) => {
        logger.error('Archive error', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Archive generation failed' });
        }
      });
      archive.pipe(res);

      // Add Metadata
      const metadata = {
        exportId: randomUUID(),
        tenantId,
        timeRange,
        generatedAt: new Date().toISOString(),
        actorId,
        eventCount: filteredEvents.length,
        accessLogCount: evidencePayload.accessLogs.length,
        adminChangeReceiptCount: evidencePayload.adminChangeReceipts.length,
        policyVersionCount: evidencePayload.policyVersions.length,
        drReceiptCount: evidencePayload.drReceipts.length,
        policyProfile: tenant.settings?.policy_profile || 'unknown',
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

      // Add Events
      archive.append(JSON.stringify(filteredEvents, null, 2), { name: 'audit_events.json' });

      archive.append(
        JSON.stringify(evidencePayload.accessLogs, null, 2),
        { name: 'access_logs.json' },
      );

      archive.append(
        JSON.stringify(evidencePayload.adminChangeReceipts, null, 2),
        { name: 'admin_change_receipts.json' },
      );

      archive.append(
        JSON.stringify(evidencePayload.policyVersions, null, 2),
        { name: 'policy_versions.json' },
      );

      archive.append(
        JSON.stringify(evidencePayload.drReceipts, null, 2),
        { name: 'dr_receipts.json' },
      );

      // Add Policy Bundle (Snapshot)
      if (tenant.settings?.policy_bundle) {
        archive.append(JSON.stringify(tenant.settings.policy_bundle, null, 2), { name: 'policy_bundle.json' });
      }

      // Add Receipt
      const bundleHash = createHash('sha256')
        .update(JSON.stringify({ metadata, eventCount: filteredEvents.length })) // Simplified hash
        .digest('hex');

      const receipt = buildReceipt('EVIDENCE_EXPORT_GENERATED', tenantId, actorId);

      // Persist to Ledger
      await provenanceLedger.appendEntry({
        action: 'EVIDENCE_EXPORT_GENERATED',
        actor: { id: actorId, role: authReq.user?.role || 'user' },
        metadata: {
            tenantId,
            exportId: metadata.exportId,
            timeRange,
            bundleHash,
        },
        artifacts: []
      });

      archive.append(JSON.stringify({ ...receipt, bundleHash }, null, 2), { name: 'receipt.json' });

      await archive.finalize();

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        logger.error('Error in POST /api/evidence/exports:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
  }
);

export default router;
