import express from 'express';
import { governanceDashboardService } from '../services/GovernanceDashboardService.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    // Check for tenant context
    const tenantId = (req as any).user?.tenant_id || (req as any).context?.tenantId;

    if (!tenantId) {
        // Fallback for development/testing if no tenant is present
         return res.status(400).json({ error: 'Tenant ID required' });
    }

    const data = await governanceDashboardService.getDashboardData(tenantId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
