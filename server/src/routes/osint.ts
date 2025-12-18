import express, { Request, Response } from 'express';
import { OSINTPrioritizationService } from '../services/OSINTPrioritizationService';
import { VeracityScoringService } from '../services/VeracityScoringService';
import { osintQueue } from '../services/OSINTQueueService';
import { ensureAuthenticated } from '../middleware/auth'; // Assuming this exists

const router = express.Router();
const prioritizationService = new OSINTPrioritizationService();
const veracityService = new VeracityScoringService();

// Trigger prioritization cycle
router.post('/prioritize', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const targets = await prioritizationService.runPrioritizationCycle(tenantId);
    res.json({ success: true, targets, message: `Queued ${targets.length} targets for enrichment` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually trigger scoring for an entity
router.post('/score/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const score = await veracityService.scoreEntity(id);
    res.json({ success: true, score });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
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
