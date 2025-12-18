import express from 'express';
import { z } from 'zod/v4';
import { storageTierRecommender, WorkloadSpecsSchema } from '../services/StorageTierRecommenderService.js';
import { AppError } from '../lib/errors.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/storage/recommend
 * Recommend storage tier based on workload characteristics
 */
router.post('/recommend', async (req, res, next) => {
  try {
    const validationResult = WorkloadSpecsSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError(
        'Invalid workload specifications',
        400,
        { details: validationResult.error.format() }
      );
    }

    const recommendation = storageTierRecommender.recommendStorageTier(validationResult.data);

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    logger.error('Error in storage recommendation', error);
    next(error);
  }
});

export default router;
