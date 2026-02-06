import express from 'express';
import crypto from 'crypto';
import { exportData } from '../analytics/exports/ExportController.js';
import { validateArtifactId } from '../utils/security.js';
import { WatermarkVerificationService } from '../exports/WatermarkVerificationService.js';
import { sensitiveContextMiddleware } from '../middleware/sensitive-context.js';
import { highRiskApprovalMiddleware } from '../middleware/high-risk-approval.js';
import { ensureAuthenticated, requirePermission } from '../middleware/auth.js';

const router = express.Router();
const watermarkVerificationService = new WatermarkVerificationService();
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

router.post(
  '/sign-manifest',
  ensureAuthenticated,
  requirePermission('export:investigations'),
  async (req, res) => {
  try {
    const { tenant, filters, timestamp } = req.body;

    // Create a canonical string representation of the export manifest
    const manifestString = JSON.stringify({ tenant, filters, timestamp });

    // In a real system, we'd use a private key from KMS/Secrets
    let secret = process.env.EXPORT_SIGNING_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('EXPORT_SIGNING_SECRET is not configured');
      }
      // In dev/test, fallback to a known secret if not provided
      secret = 'dev-secret';
    }

    const signature = crypto
      .createHmac('sha256', secret)
      .update(manifestString)
      .digest('hex');

    res.json({
      signature,
      algorithm: 'hmac-sha256',
      manifest: { tenant, filters, timestamp }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to sign manifest' });
  }
});

router.post(
  '/analytics/export',
  ensureAuthenticated,
  requirePermission('export:investigations'),
  sensitiveContextMiddleware,
  highRiskApprovalMiddleware,
  exportData,
);

router.post(
  '/exports/:id/verify-watermark',
  ensureAuthenticated,
  requirePermission('export:investigations'),
  async (req, res) => {
  if (process.env.WATERMARK_VERIFY !== 'true') {
    return res.status(404).json({ error: 'Watermark verification not enabled' });
  }

  const id = singleParam(req.params.id);
  const { artifactId, watermark } = req.body || {};

  // Security: Prevent path traversal in artifactId
  if (!validateArtifactId(artifactId)) {
    return res.status(400).json({ error: 'Invalid artifactId' });
  }

  try {
    const result = await watermarkVerificationService.verify({
      exportId: id,
      artifactId,
      watermark,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
