import express from 'express';
import { narrativePrioritizer } from '../services/NarrativePrioritizationService.js';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/prioritize', async (req, res) => {
  const start = Date.now();
  try {
    const { text, entities, source, metadata } = req.body;

    if (!text || !source) {
      return res.status(400).json({ error: 'Missing required fields: text, source' });
    }

    const result = await narrativePrioritizer.prioritize({
      text,
      entities: entities || [],
      source,
      metadata
    });

    // Record custom metrics for SLO tracking
    const duration = Date.now() - start;
    telemetry.recordRequest(duration, {
        method: 'POST',
        route: '/api/narrative-prioritization/prioritize',
        status: 200
    });

    // We could add a custom histogram metric here if needed specifically for this service
    // e.g. narrative_prioritization_score

    res.json(result);
  } catch (error) {
    logger.error('Error in narrative prioritization endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
