import express from 'express';
import { persistentUsageRepository } from './persistence.js';
import { quotaManager } from './quotas.js';
import { ensureAuthenticated } from '../middleware/auth.js';

export const meteringRouter = express.Router();

// Middleware to ensure admin access
const ensureAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user;
  if (!user) {
     res.status(401).json({ error: 'Unauthorized' });
     return;
  }

  // Check for admin role
  // This depends on the user model. Assuming role or scopes.
  if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
  }

  next();
};

// GET /summary?tenantId=&from=&to=
meteringRouter.get('/summary', ensureAuthenticated, async (req, res) => {
  try {
    const { tenantId, from, to } = req.query;

    const targetTenantId = (tenantId as string) || req.user?.tenantId;

    if (!targetTenantId) {
       res.status(400).json({ error: 'Tenant ID required' });
       return;
    }

    // Tenant Isolation
    if (req.user?.tenantId && req.user.tenantId !== targetTenantId) {
         // Unless admin
         if (req.user.role !== 'admin') {
             res.status(403).json({ error: 'Forbidden' });
             return;
         }
    }

    const usage = await persistentUsageRepository.list(
      targetTenantId,
      from as string,
      to as string
    );

    res.json({
        data: usage
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /quotas (Admin only)
meteringRouter.post('/quotas', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { tenantId, config } = req.body;

    if (!tenantId || !config) {
       res.status(400).json({ error: 'Missing tenantId or config' });
       return;
    }

    await quotaManager.setQuota(tenantId, config);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
