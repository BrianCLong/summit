import express from 'express';
import { z } from 'zod';
import { threatModelingService } from '../services/ThreatModelingService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Input validation schema
const ThreatModelRequestSchema = z.object({
  serviceName: z.string().min(1),
  description: z.string().min(10),
  architecture: z.string().min(10),
  dataFlow: z.string().min(10),
});

/**
 * @route POST /api/security/threat-model
 * @desc Generate a STRIDE threat model for a service
 * @access Private
 */
router.post('/threat-model', ensureAuthenticated, async (req, res) => {
  try {
    const inputs = ThreatModelRequestSchema.parse(req.body);

    const threatModel = await threatModelingService.generateThreatModel(
      inputs,
      req.user?.id,
      req.user?.tenantId
    );

    res.json(threatModel);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.errors });
    } else {
      logger.error('Error generating threat model', { error: error.message });
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
});

export default router;
