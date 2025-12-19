import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { finOpsRollupService } from '../services/FinOpsRollupService.js';

const router = express.Router();

router.get('/rollups', ensureAuthenticated, async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req as any).user?.tenant_id;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }

    const days = Math.max(
      1,
      Math.min(
        90,
        parseInt((req.query?.days as string) || '30', 10) || 30,
      ),
    );

    const overview = await finOpsRollupService.getRollups(tenantId, days);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});

export default router;
