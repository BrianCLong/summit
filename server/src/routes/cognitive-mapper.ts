import express from 'express';
import { z } from 'zod';
import { CognitiveMapperService } from '../services/CognitiveMapperService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const service = CognitiveMapperService.getInstance();

// Validation Schemas
const PropagationSchema = z.object({
  startNodeId: z.string(),
  narrativeStrength: z.number().min(0).max(1).default(1.0),
  steps: z.number().min(1).max(10).default(3)
});

const AmplifierSchema = z.object({
  investigationId: z.string()
});

const ForecastSchema = z.object({
  nodeId: z.string(),
  timeSteps: z.number().min(1).max(20).default(5)
});

/**
 * @route POST /api/cognitive/map-propagation
 * @desc Simulates narrative propagation
 * @access Private
 */
router.post(
  '/map-propagation',
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { startNodeId, narrativeStrength, steps } = PropagationSchema.parse(req.body);
      const tenantId = req.user?.tenantId;

      const result = await service.simulatePropagation(
        startNodeId,
        narrativeStrength,
        steps,
        tenantId
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Error in map-propagation:', error);
      res.status(500).json({ error: 'Failed to map propagation' });
    }
  }
);

/**
 * @route POST /api/cognitive/amplifiers
 * @desc Detects amplification nodes in an investigation
 * @access Private
 */
router.post(
  '/amplifiers',
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { investigationId } = AmplifierSchema.parse(req.body);
      const tenantId = req.user?.tenantId;

      const amplifiers = await service.detectAmplifiers(investigationId, tenantId);
      res.json({ amplifiers });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Error in amplifiers:', error);
      res.status(500).json({ error: 'Failed to detect amplifiers' });
    }
  }
);

/**
 * @route POST /api/cognitive/forecast-opinion
 * @desc Forecasts opinion shift for a node
 * @access Private
 */
router.post(
  '/forecast-opinion',
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { nodeId, timeSteps } = ForecastSchema.parse(req.body);
      const tenantId = req.user?.tenantId;

      const forecast = await service.forecastOpinionShift(nodeId, timeSteps, tenantId);
      res.json(forecast);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Error in forecast-opinion:', error);
      res.status(500).json({ error: 'Failed to forecast opinion' });
    }
  }
);

export default router;
