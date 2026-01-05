import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { opaAllow } from '../../policy/opaClient.js';
import { tenantService, createTenantSchema } from '../../services/TenantService.js';
import { tenantProvisioningService } from '../../services/tenants/TenantProvisioningService.js';
import { tenantIsolationGuard } from '../../tenancy/TenantIsolationGuard.js';
import logger from '../../utils/logger.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
    tenantId?: string;
    tenant_id?: string;
  };
}

const router = express.Router();

const adminProvisionSchema = createTenantSchema.and(
  z.object({
    plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).default('ENTERPRISE'),
    environment: z.enum(['prod', 'staging', 'dev']).default('prod'),
    requestedSeats: z.number().int().min(1).max(10000).optional(),
    storageEstimateBytes: z.number().int().min(0).optional(),
  }),
);

router.post('/tenants', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const actorId = authReq.user?.id;
    const actorRole = authReq.user?.role || 'unknown';
    if (!actorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
    }

    const body = adminProvisionSchema.parse(req.body);

    const decision = await opaAllow('tenants/provision', {
      action: 'tenant.provision',
      tenant: 'system',
      resource: 'tenant',
      user: {
        id: actorId,
        roles: [actorRole],
      },
      meta: {
        residency: body.residency,
        region: body.region,
        plan: body.plan,
        environment: body.environment,
      },
    });

    if (!decision.allow) {
      return res.status(403).json({
        success: false,
        error: decision.reason || 'Policy denied tenant provisioning',
      });
    }

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

    const policy = tenantIsolationGuard.evaluatePolicy(tenantContext, {
      action: 'tenant.provision.admin',
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
        namespace: provisioning.namespace,
        partitions: provisioning.partitions,
        quota: provisioning.quota,
        isolationDefaults: {
          environment: tenantContext.environment,
          privilegeTier: tenantContext.privilegeTier,
          quotas: provisioning.quota,
        },
      },
      receipts: provisioning.receipts,
      policy: {
        opa: decision,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
    }
    logger.error('Admin tenant provisioning failed', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
