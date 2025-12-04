import express from 'express';
import { EntityResolutionService } from '../services/EntityResolutionService.js';
import pino from 'pino';

const router = express.Router();
const logger = pino({ name: 'ERAdminRoutes' });
const erService = new EntityResolutionService();

// POST /admin/er/evaluate
router.post('/evaluate', async (req, res) => {
  try {
    // In a real scenario, golden set is loaded from a file or DB
    // For MVP/Sprint, we define a small static set or load from a known location
    const goldenSet = [
      { id1: 'e1', id2: 'e2', isMatch: true },
      { id1: 'e3', id2: 'e4', isMatch: false }
    ];

    const metrics = await erService.evaluateModel(goldenSet);

    // Log metrics for observability
    logger.info({ metrics }, 'ER Evaluation Completed');

    res.json(metrics);
  } catch (error) {
    logger.error({ error }, 'ER Evaluation Failed');
    res.status(500).json({ error: (error as any).message });
  }
});

export default router;
