import { Router, type Request, type Response } from 'express';
import { policyProfileService } from '../services/PolicyProfileService.js';
import logger from '../utils/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

/**
 * @route GET /api/policy-profiles
 * @desc List available policy profiles
 * @access Protected
 */
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const profiles = policyProfileService.getProfiles();
    res.json({
      success: true,
      data: profiles,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/policy-profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export default router;
