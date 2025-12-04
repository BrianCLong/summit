import express from 'express';
import { EntityResolutionService } from '../services/EntityResolutionService.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const entityResolutionService = new EntityResolutionService(); // Or import singleton if available

router.get('/review-queue', async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  try {
    const queue = await entityResolutionService.getReviewQueue(tenantId as string);
    res.json(queue);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

router.post('/review-decision', async (req, res) => {
  const { reviewId, decision, notes } = req.body;
  const reviewerId = (req as any).user?.id || 'unknown'; // Should come from auth

  if (!reviewId || !decision) {
    return res.status(400).json({ error: 'Review ID and decision required' });
  }

  try {
    await entityResolutionService.submitReviewDecision(reviewId, decision, reviewerId, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to submit decision' });
  }
});

export default router;
