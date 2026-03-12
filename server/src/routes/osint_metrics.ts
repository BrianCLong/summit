import express, { type Request, type Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { OSINTMetricsService } from '../osint/metrics/OSINTMetricsService.js';

import { AuthenticatedRequest } from './types.js';

const router = express.Router();

router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId || 'unknown';
    const hoursStr = req.query.hours as string;
    const hours = hoursStr ? parseInt(hoursStr, 10) : 24;

    const metrics = OSINTMetricsService.getMetrics(tenantId, isNaN(hours) ? 24 : hours);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to simulate reporting analyst override (for demo/testing purposes)
router.post('/override', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId || 'unknown';
    const { leadId, overrideType } = req.body;

    if (!leadId || !overrideType) {
      return res.status(400).json({ success: false, error: 'leadId and overrideType are required' });
    }

    OSINTMetricsService.recordEvent({
      tenantId,
      eventType: 'analyst_override',
      leadId,
      details: { overrideType }
    });

    res.json({ success: true, message: 'Analyst override recorded successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin-only clear metrics (for synthetic testing)
router.delete('/clear', ensureAuthenticated, async (req: Request, res: Response) => {
  OSINTMetricsService._clearStore();
  res.json({ success: true, message: 'Metrics store cleared' });
});

export default router;
