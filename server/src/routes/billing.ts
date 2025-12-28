import express from 'express';
import { meteringService } from '../services/billing/MeteringService';
import { ensureAuthenticated } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Validation schema for date range
const previewSchema = z.object({
  query: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

/**
 * GET /api/billing/usage/preview
 * Returns a usage preview for the current tenant.
 */
router.get(
  '/usage/preview',
  ensureAuthenticated,
  validateRequest(previewSchema),
  async (req, res, next) => {
    try {
      // The query params are already validated and parsed by the middleware
      const { start, end } = req.query as { start: string; end: string };
      const tenantId = (req as any).user.tenantId;

      if (!tenantId) {
        res.status(401).json({ error: 'Tenant context required' });
        return;
      }

      const preview = await meteringService.getUsagePreview(
        tenantId,
        new Date(start),
        new Date(end),
      );

      res.json(preview);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
