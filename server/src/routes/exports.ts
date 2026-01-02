import express from 'express';
import crypto from 'crypto';
import { exportData } from '../analytics/exports/ExportController.js';
import { WatermarkVerificationService } from '../exports/WatermarkVerificationService.js';

const router = express.Router();
const watermarkVerificationService = new WatermarkVerificationService();

router.post('/sign-manifest', async (req, res) => {
  try {
    const { tenant, filters, timestamp } = req.body;

    // Create a canonical string representation of the export manifest
    const manifestString = JSON.stringify({ tenant, filters, timestamp });

    // In a real system, we'd use a private key from KMS/Secrets
    const secret = process.env.EXPORT_SIGNING_SECRET || 'dev-secret';

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

router.post('/analytics/export', exportData);

router.post('/exports/:id/verify-watermark', async (req, res) => {
  if (process.env.WATERMARK_VERIFY !== 'true') {
    return res.status(404).json({ error: 'Watermark verification not enabled' });
  }

  const { id } = req.params;
  const { artifactId, watermark } = req.body || {};

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
