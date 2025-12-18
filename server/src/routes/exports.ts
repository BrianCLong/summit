
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

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
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign manifest' });
  }
});

export default router;
