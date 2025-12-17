import express, { Request, Response } from 'express';
import { predictiveThreatService } from '../services/PredictiveThreatService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /forecast/:signal
 * Get a forecast for a specific signal.
 * Query params:
 * - horizon: number of hours to forecast (default: 24)
 */
router.get('/forecast/:signal', async (req: Request, res: Response) => {
  try {
    const signal = req.params.signal;
    const horizon = parseInt(req.query.horizon as string) || 24;

    const result = await predictiveThreatService.forecastSignal(signal, horizon);
    res.json(result);
  } catch (error) {
    logger.error('Error fetching forecast:', error);
    // Handle known errors (like missing signal) with 404 or 400
    if (error instanceof Error && error.message.includes('No historical data')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

/**
 * POST /simulate
 * Run a counterfactual simulation.
 * Body:
 * - signal: string
 * - action: string
 * - impactFactor: number (e.g. -0.2 for 20% reduction)
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { signal, action, impactFactor } = req.body;

    if (!signal || !action || impactFactor === undefined) {
      return res.status(400).json({ error: 'Missing required parameters: signal, action, impactFactor' });
    }

    const result = await predictiveThreatService.simulateCounterfactual(signal, {
      action,
      impactFactor
    });
    res.json(result);
  } catch (error) {
    logger.error('Error running simulation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
