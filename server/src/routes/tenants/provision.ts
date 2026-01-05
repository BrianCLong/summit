// @ts-nocheck
import { Router, Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { tenantService, createTenantSchema } from '../../services/TenantService.js';
import { tenantProvisioningService } from '../../services/tenants/TenantProvisioningService.js';
import { tenantIsolationGuard } from '../../tenancy/TenantIsolationGuard.js';
import logger from '../../utils/logger.js';
import { AuthenticatedRequest } from '../types.js';

const router = Router();

const provisionSchema = createTenantSchema.extend({
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).default('STARTER'),
  environment: z.enum(['prod', 'staging', 'dev']).default('prod'),
  requestedSeats: z.number().int().min(1).max(10000).optional(),
  storageEstimateBytes: z.number().int().min(0).optional(),
});

router.post('/', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actorId = req.user?.id;
    if (!actorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
    }

    const body = provisionSchema.parse(req.body);
    const tenant = await tenantService.createTenant(body, actorId);

    const provisioning = await tenantProvisioningService.provisionTenant({
      tenant,
      plan: body.plan,
      environment: body.environment,
      requestedSeats: body.requestedSeats,
      storageEstimateBytes: body.storageEstimateBytes,
      actorId,
      actorType: 'user',
      correlationId: (req as any).correlationId,
      requestId: (req as any).id,
    });

    const tenantContext = {
      tenantId: tenant.id,
      environment: body.environment,
      privilegeTier: 'standard' as const,
      userId: actorId,
    };

    // Run isolation guard to ensure defaults are valid
    const policy = tenantIsolationGuard.evaluatePolicy(tenantContext, {
      action: 'tenant.provision',
      environment: body.environment,
      resourceTenantId: tenant.id,
    });
    if (!policy.allowed) {
      return res.status(policy.status || 403).json({
        success: false,
        error: policy.reason || 'Isolation policy denied provisioning',
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        tenant,
        isolationDefaults: {
          environment: tenantContext.environment,
          privilegeTier: tenantContext.privilegeTier,
          quotas: provisioning.quota,
        },
        namespace: provisioning.namespace,
        partitions: provisioning.partitions,
        quota: provisioning.quota,
      },
      receipts: provisioning.receipts,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
    }
    logger.error('Tenant provisioning failed', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
