import express from 'express';
import { z } from 'zod';
import { MasintService } from '../services/MasintService.js';
import { MasintSignalSchema } from '../types/masint.types.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const masintService = MasintService.getInstance();

/**
 * @route POST /api/masint/ingest
 * @desc Ingest a raw MASINT signal for analysis
 * @access Private
 */
router.post('/ingest', ensureAuthenticated, async (req, res) => {
  try {
    const validation = MasintSignalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid signal format',
        details: validation.error.format()
      });
    }

    const result = await masintService.processSignal(validation.data);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error processing MASINT signal:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route GET /api/masint/analysis/:id
 * @desc Retrieve analysis result for a specific signal
 * @access Private
 */
router.get('/analysis/:id', ensureAuthenticated, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await masintService.getAnalysis(id);

    if (!result) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result);
  } catch (error) {
    logger.error({ error, id }, 'Error retrieving analysis');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
