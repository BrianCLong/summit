import express, { type Request, type Response } from 'express';
// import { OSINTPrioritizationService } from '../services/OSINTPrioritizationService.js';
// import { VeracityScoringService } from '../services/VeracityScoringService.js';
import { osintQueue } from '../services/OSINTQueueService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { osintRateLimiter } from '../middleware/osintRateLimiter.js';
import { osintService } from '../services/osint_service.js';

interface AuthenticatedRequest extends Request {
  user?: {
    tenantId?: string;
  };
}

const router = express.Router();
// const prioritizationService = new OSINTPrioritizationService();
// const veracityService = new VeracityScoringService();

router.use(osintRateLimiter);

// GET latest IOCs
router.get('/iocs', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const iocs = await osintService.getLatestIOCs(limit);
    res.json({ success: true, data: iocs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger Ingestion
router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const url = req.body.url; // Optional: custom URL
    const result = await osintService.ingestFeed(url);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger Analysis
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const limit = req.body.limit || 5;
    const result = await osintService.analyzePending(limit);
    res.json({ success: true, processed: result.length, results: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
