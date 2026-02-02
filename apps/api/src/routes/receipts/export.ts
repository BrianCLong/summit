import { Request, Response, Router } from 'express';
import {
  assembleExportBundle,
  ExportBundleInput,
  ReceiptRecord,
  PolicyDecisionRecord,
  RedactionRules,
} from '../../../../prov-ledger-service/src/export/bundleAssembler';
import { Manifest } from '../../../../prov-ledger-service/src/ledger';
import { RBACManager } from '../../../../../packages/authentication/src/rbac/rbac-manager.js';
import { requirePermission } from '../../middleware/security.js';

function parsePayload(body: any): ExportBundleInput {
  const manifest = body.manifest as Manifest | undefined;
  if (!manifest) {
    throw new Error('manifest_required');
  }

  return {
    manifest,
    receipts: (body.receipts as ReceiptRecord[] | undefined) ?? [],
    policyDecisions:
      (body.policyDecisions as PolicyDecisionRecord[] | undefined) ?? [],
    redaction: (body.redaction as RedactionRules | undefined) ?? undefined,
  };
}

export function createExportRouter(rbacManager: RBACManager): Router {
  const router = Router();

  router.post('/receipts/export', requirePermission(rbacManager, 'receipts', 'read'), async (req: Request, res: Response) => {
    try {
      const payload = parsePayload(req.body);
      const { stream, metadata } = assembleExportBundle(payload);

      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader(
        'X-Redaction-Applied',
        metadata.redaction.applied ? 'true' : 'false',
      );
      stream.pipe(res);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'export_failed',
      });
    }
  });

  return router;
}

export default createExportRouter;
