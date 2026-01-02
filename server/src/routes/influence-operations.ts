import express from 'express';
import { InfluenceOperationsService } from '../services/InfluenceOperationsService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware
router.use(ensureAuthenticated);

/**
 * @route GET /api/influence-operations/detect/:campaignId
 * @desc Run influence operation detection pipeline
 */
router.get('/detect/:campaignId', async (req, res, next) => {
  try {
    const service = InfluenceOperationsService.getInstance();
    const result = await service.detectInfluenceOperations(req.params.campaignId);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * @route GET /api/influence-operations/narrative/:id/timeline
 * @desc Get narrative evolution timeline
 */
router.get('/narrative/:id/timeline', async (req, res, next) => {
  try {
    const service = InfluenceOperationsService.getInstance();
    const result = await service.getNarrativeTimeline(req.params.id);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * @route GET /api/influence-operations/narrative/:id/network
 * @desc Get influence network analysis
 */
router.get('/narrative/:id/network', async (req, res, next) => {
  try {
    const service = InfluenceOperationsService.getInstance();
    const result = await service.getInfluenceNetwork(req.params.id);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

export default router;
