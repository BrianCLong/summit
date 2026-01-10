import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { policyProfileService } from '../services/PolicyProfileService.js';
import { policyProfileAssignmentService } from '../services/policy-profiles/PolicyProfileAssignmentService.js';
import logger from '../utils/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();
const assignProfileSchema = z.object({
  profileId: z.string().min(1),
  tenantId: z.string().optional(),
  source: z.string().optional(),
});

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

/**
 * @route POST /api/policy-profiles/assign
 * @desc Assign a policy profile to a tenant and emit a receipt
 * @access Protected
 */
router.post('/assign', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const parseResult = assignProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
      return;
    }

    const user = (req as any).user;
    const tenantId =
      parseResult.data.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      user?.tenantId ||
      'default-tenant';

    const result = await policyProfileAssignmentService.assignProfile({
      tenantId,
      profileId: parseResult.data.profileId,
      actorId: user?.id || 'system',
      actorType: 'user',
      source: parseResult.data.source || 'api:policy-profiles:assign',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error in POST /api/policy-profiles/assign:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
});

export default router;
