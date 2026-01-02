import express from 'express';
import { meteringService } from '../services/billing/MeteringService';
import { ensureAuthenticated } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Validation schema for date range
const previewSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

/**
 * GET /api/billing/usage/preview
 * Returns a usage preview for the current tenant.
 */
router.get('/usage/preview', ensureAuthenticated, async (req, res, next) => {
  try {
    const { start, end } = previewSchema.parse(req.query);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      res.status(401).json({ error: 'Tenant context required' });
      return;
    }

    const preview = await meteringService.getUsagePreview(
      tenantId,
      new Date(start),
      new Date(end)
    );

    res.json(preview);
  } catch (error: any) {
    next(error);
  }
});

export default router;
