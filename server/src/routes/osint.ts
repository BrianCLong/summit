// @ts-nocheck
import express, { type Request, type Response } from 'express';
// import { OSINTPrioritizationService } from '../services/OSINTPrioritizationService.js';
// import { VeracityScoringService } from '../services/VeracityScoringService.js';
import { osintQueue } from '../services/OSINTQueueService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { osintRateLimiter } from '../middleware/osintRateLimiter.js';

interface AuthenticatedRequest extends Request {
  user?: {
    tenantId?: string;
  };
}

const router = express.Router();
// const prioritizationService = new OSINTPrioritizationService();
// const veracityService = new VeracityScoringService();

router.use(osintRateLimiter);

// Trigger prioritization cycle
router.post('/prioritize', ensureAuthenticated, async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'OSINTPrioritizationService not implemented' });
  /*
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId;
      const targets = await prioritizationService.runPrioritizationCycle(tenantId);
      res.json({ success: true, targets, message: `Queued ${targets.length} targets for enrichment` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  */
});

// Manually trigger scoring for an entity
router.post('/score/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'VeracityScoringService not implemented' });
  /*
    try {
      const { id } = req.params;
      const score = await veracityService.scoreEntity(id);
      res.json({ success: true, score });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  */
});

// Get queue status
router.get('/queue', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const counts = await osintQueue.getJobCounts();
    res.json({ success: true, counts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
