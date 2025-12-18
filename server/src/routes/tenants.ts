import { Router } from 'express';
import { z } from 'zod';
import { tenantService, createTenantSchema } from '../services/TenantService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * @route POST /api/tenants
 * @desc Create a new tenant (Self-Serve)
 * @access Protected (Requires Authentication)
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    // Validate request body
    const input = createTenantSchema.parse(req.body);

    // Get actor from authenticated user
    const actorId = req.user?.id;
    if (!actorId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
    }

    const tenant = await tenantService.createTenant(input, actorId);

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.errors,
      });
    } else if (error instanceof Error && error.message.includes('already taken')) {
        res.status(409).json({
            success: false,
            error: error.message
        });
    } else {
      logger.error('Error in POST /api/tenants:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }
});

/**
 * @route GET /api/tenants/:id
 * @desc Get tenant details
 * @access Protected
 */
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.params.id;
        const tenant = await tenantService.getTenant(tenantId);

        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        const userId = req.user?.id;
        const userTenantId = req.user?.tenantId || req.user?.tenant_id; // Check both standard props

        // Authorization:
        // 1. User is the creator of the tenant
        // 2. User belongs to the tenant
        // 3. User is a platform super-admin
        const isCreator = tenant.createdBy === userId;
        const isMember = userTenantId === tenant.id;
        const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

        if (!isCreator && !isMember && !isSuperAdmin) {
            logger.warn(`Access denied for user ${userId} to tenant ${tenantId}`);
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        res.json({ success: true, data: tenant });
    } catch (error) {
        logger.error('Error in GET /api/tenants/:id:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

export default router;
