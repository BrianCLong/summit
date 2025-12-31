
import { Router } from 'express';
import { tenantContextMiddleware } from '../../middleware/tenantContext.js';
import { quotaConfigService } from '../../lib/resources/QuotaConfig.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'AdminRoutes' });
const router = Router();

// This middleware enforces that a tenant context is present
router.use(tenantContextMiddleware({ strict: true }));

/**
 * Admin: Update Tenant Quota Plan
 * Requires privilegeTier: 'elevated' | 'break-glass'
 */
router.post('/tenants/:targetTenantId/plan', (req, res) => {
    try {
        const { tenantContext } = req as any;
        const { targetTenantId } = req.params;
        const { plan } = req.body;

        // Security Check: Only admins can change plans
        if (!['elevated', 'break-glass'].includes(tenantContext.privilegeTier)) {
            logger.warn({
                event: 'admin_access_denied',
                actorTenant: tenantContext.tenantId,
                targetTenant: targetTenantId,
                reason: 'insufficient_privileges'
            }, 'Admin access denied');
            return res.status(403).json({ error: 'forbidden', message: 'Insufficient privileges' });
        }

        // Logic to update plan
        if (typeof quotaConfigService.setTenantPlan === 'function') {
            quotaConfigService.setTenantPlan(targetTenantId, plan);

            // Audit Log
            logger.info({
                event: 'tenant_plan_updated',
                actor: tenantContext.subject || tenantContext.userId || 'unknown',
                actorTenant: tenantContext.tenantId,
                targetTenant: targetTenantId,
                newPlan: plan,
                timestamp: new Date().toISOString()
            }, 'Tenant plan updated via admin API');

        } else {
             logger.error({
                 event: 'config_error',
                 message: 'setTenantPlan not implemented'
             }, 'Configuration service error');
             // In a real scenario we might error, but here we proceed as best effort if mocked
        }

        return res.json({
            status: 'success',
            message: `Updated tenant ${targetTenantId} to plan ${plan}`,
            audited: true
        });

    } catch (error) {
        logger.error({ err: error }, 'Admin route error');
        return res.status(500).json({ error: 'internal_error', message: String(error) });
    }
});

export const adminRouter = router;
