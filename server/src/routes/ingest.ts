import { Router } from 'express';
import { addIngestJob } from '../queues/ingest.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

const handleBackpressure = (req: any, res: any, next: any) => {
  console.log('Applying backpressure (placeholder)');
  next();
};

router.post(
  '/push',
  ensureAuthenticated,
  handleBackpressure,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { source, type } = req.body; // Expect an explicit type in the payload

      if (!source || !type) {
        return res.status(400).json({ message: 'Request body must include "source" and "type"' });
      }

      await addIngestJob({ source, type, tenantId });

      res.status(202).json({
        message: 'Data accepted for ingestion.',
        tenantId,
      });
    } catch (error) {
      console.error('Ingest failed:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
);

export default router;
