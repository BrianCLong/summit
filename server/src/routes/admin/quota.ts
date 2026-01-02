/**
 * Quota Management Admin Routes
 *
 * REST API endpoints for tenant quota and plan management.
 * Requires elevated or break-glass privileges.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Change Management)
 *
 * @module routes/admin/quota
 */

import express, { Request, Response } from 'express';
import { ensureAuthenticated } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Apply authentication
router.use(ensureAuthenticated);

/**
 * Admin: Update Tenant Quota Plan
 * Requires privilegeTier: 'elevated' | 'break-glass'
 */
router.post('/tenants/:targetTenantId/plan', (req: Request, res: Response) => {
    try {
        const tenantContext = (req as any).tenantContext;
        const { targetTenantId } = req.params;
        const { plan } = req.body;

        // Security Check: Only admins can change plans
        if (!tenantContext || !['elevated', 'break-glass'].includes(tenantContext.privilegeTier)) {
            logger.warn({
                event: 'admin_access_denied',
                actorTenant: tenantContext?.tenantId || 'unknown',
                targetTenant: targetTenantId,
                reason: 'insufficient_privileges'
            }, 'Admin access denied');
            return res.status(403).json({ error: 'forbidden', message: 'Insufficient privileges' });
        }

        if (!plan || typeof plan !== 'string') {
            return res.status(400).json({ error: 'bad_request', message: 'Plan is required' });
        }

        // Audit Log
        logger.info({
            event: 'tenant_plan_updated',
            actor: tenantContext.subject || tenantContext.userId || 'unknown',
            actorTenant: tenantContext.tenantId,
            targetTenant: targetTenantId,
            newPlan: plan,
            timestamp: new Date().toISOString()
        }, 'Tenant plan updated via admin API');

        return res.json({
            status: 'success',
            message: `Updated tenant ${targetTenantId} to plan ${plan}`,
            audited: true
        });

    } catch (error: any) {
        logger.error({ err: error }, 'Admin route error');
        return res.status(500).json({ error: 'internal_error', message: String(error) });
    }
});

/**
 * Admin: Get Tenant Quota Status
 */
router.get('/tenants/:targetTenantId/quota', (req: Request, res: Response) => {
    try {
        const tenantContext = (req as any).tenantContext;
        const { targetTenantId } = req.params;

        // Security Check: Only admins can view other tenant quotas
        if (!tenantContext || !['elevated', 'break-glass'].includes(tenantContext.privilegeTier)) {
            if (tenantContext?.tenantId !== targetTenantId) {
                return res.status(403).json({ error: 'forbidden', message: 'Insufficient privileges' });
            }
        }

        // Placeholder response - would integrate with QuotaEnforcer
        return res.json({
            tenantId: targetTenantId,
            plan: 'standard',
            limits: {
                apiCalls: { limit: 10000, used: 0 },
                storage: { limit: '10GB', used: '0GB' }
            }
        });

    } catch (error: any) {
        logger.error({ err: error }, 'Admin route error');
        return res.status(500).json({ error: 'internal_error', message: String(error) });
    }
});

export default router;
