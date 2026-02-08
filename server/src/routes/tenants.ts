// @ts-nocheck
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { tenantService, createTenantSchema } from '../services/TenantService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { ensurePolicy } from '../middleware/abac.js';
import { ProvenanceRepo } from '../repos/ProvenanceRepo.js';
import { getPostgresPool } from '../config/database.js';
import archiver from 'archiver';
import { createHash, randomUUID } from 'crypto';
import provisionRouter from './tenants/provision.js';
import { tenantUsageService } from '../services/TenantUsageService.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    tenantId?: string;
    tenant_id?: string;
    role?: string;
  };
}

const router = Router();

const settingsSchema = z.object({
  settings: z.record(z.any()),
});

const disableSchema = z.object({
  reason: z.string().min(3).optional(),
});

const statusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().min(3).optional(),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const usageQuerySchema = z.object({
  range: z.string().optional(),
});

router.use('/provision', provisionRouter);

function policyGate() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    req.body = { ...req.body, tenantId: req.params.id };
    next();
  };
}

function ensureTenantScope(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  const tenantId = req.params.id;
  const userTenant = authReq.user?.tenantId || authReq.user?.tenant_id;
  const isSuper = ['SUPER_ADMIN', 'ADMIN', 'admin'].includes(authReq.user?.role || '');
  if (!isSuper && userTenant && userTenant !== tenantId) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  next();
}

function buildReceipt(action: string, tenantId: string, actorId: string) {
  const issuedAt = new Date().toISOString();
  const payload = `${action}:${tenantId}:${actorId}:${issuedAt}`;
  const hash = createHash('sha256').update(payload).digest('hex');
  return {
    id: randomUUID(),
    action,
    tenantId,
    actorId,
    issuedAt,
    hash,
    policy: 'abac.ensurePolicy',
  };
}

/**
 * @route POST /api/tenants
 * @desc Create a new tenant (Self-Serve)
 * @access Protected (Requires Authentication)
 */
router.post('/', ensureAuthenticated, ensurePolicy('create', 'tenant'), async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    // Validate request body
    const input = createTenantSchema.parse(req.body);

    // Get actor from authenticated user
    const actorId = authReq.user?.id;
    if (!actorId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
    }

    const tenant = await tenantService.createTenant(input, actorId);

    res.status(201).json({
      success: true,
      data: tenant,
      receipt: buildReceipt('TENANT_CREATED', tenant.id, actorId),
    });
  } catch (error: any) {
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
router.get('/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const tenantId = req.params.id;
        const tenant = await tenantService.getTenant(tenantId);

        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        const userId = authReq.user?.id;
        const userTenantId = authReq.user?.tenantId || authReq.user?.tenant_id; // Check both standard props

        // Authorization:
        // 1. User is the creator of the tenant
        // 2. User belongs to the tenant
        // 3. User is a platform super-admin
        const isCreator = tenant.createdBy === userId;
        const isMember = userTenantId === tenant.id;
        const isSuperAdmin = authReq.user?.role === 'SUPER_ADMIN';

        if (!isCreator && !isMember && !isSuperAdmin) {
            logger.warn(`Access denied for user ${userId} to tenant ${tenantId}`);
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        res.json({ success: true, data: tenant });
    } catch (error: any) {
        logger.error('Error in GET /api/tenants/:id:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

router.get(
  '/:id/settings',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('read', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = req.params.id;
      const data = await tenantService.getTenantSettings(tenantId);
      return res.json({
        success: true,
        data,
        receipt: buildReceipt('TENANT_SETTINGS_VIEWED', tenantId, authReq.user?.id || 'unknown'),
      });
    } catch (error: any) {
      logger.error('Error in GET /api/tenants/:id/settings:', error);
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

router.put(
  '/:id/settings',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('update', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = settingsSchema.parse(req.body);
      const tenantId = req.params.id;
      const actorId = authReq.user?.id || 'unknown';
      const updated = await tenantService.updateSettings(tenantId, body.settings, actorId);
      return res.json({
        success: true,
        data: updated,
        receipt: buildReceipt('TENANT_SETTINGS_UPDATED', tenantId, actorId),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
      }
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      logger.error('Error in PUT /api/tenants/:id/settings:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

router.post(
  '/:id/disable',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('update', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { reason } = disableSchema.parse(req.body);
      const tenantId = req.params.id;
      const actorId = authReq.user?.id || 'unknown';
      const updated = await tenantService.disableTenant(tenantId, actorId, reason);
      return res.json({
        success: true,
        data: updated,
        receipt: buildReceipt('TENANT_DISABLED', tenantId, actorId),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
      }
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      logger.error('Error in POST /api/tenants/:id/disable:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

router.patch(
  '/:id',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('update', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { status, reason } = statusSchema.parse(req.body);
      const tenantId = req.params.id;
      const actorId = authReq.user?.id || 'unknown';
      const updated = await tenantService.updateStatus(tenantId, status, actorId, reason);
      return res.json({
        success: true,
        data: updated,
        receipt: buildReceipt('TENANT_STATUS_UPDATED', tenantId, actorId),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
      }
      if (error instanceof Error && error.message === 'Tenant not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      logger.error('Error in PATCH /api/tenants/:id:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

router.get(
  '/:id/usage',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('read', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = req.params.id;
      const { range } = usageQuerySchema.parse(req.query);
      const usage = await tenantUsageService.getTenantUsage(tenantId, range);
      return res.json({
        success: true,
        data: usage,
        receipt: buildReceipt('TENANT_USAGE_VIEWED', tenantId, authReq.user?.id || 'unknown'),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
      }
      if (error instanceof Error && error.message.startsWith('Invalid range')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      logger.error('Error in GET /api/tenants/:id/usage:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

router.get(
  '/:id/audit',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('read', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = auditQuerySchema.parse(req.query);
      const tenantId = req.params.id;
      const repo = new ProvenanceRepo(getPostgresPool());
      const events = await repo.by('investigation', tenantId, undefined, query.limit, query.offset, tenantId);
      return res.json({
        success: true,
        data: events,
        receipt: buildReceipt('TENANT_AUDIT_VIEWED', tenantId, authReq.user?.id || 'unknown'),
      });
    } catch (error: any) {
      logger.error('Error in GET /api/tenants/:id/audit:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

router.get(
  '/:id/audit/export',
  ensureAuthenticated,
  ensureTenantScope,
  policyGate(),
  ensurePolicy('read', 'tenant'),
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = req.params.id;
      const repo = new ProvenanceRepo(getPostgresPool());
      const events = await repo.by('investigation', tenantId, undefined, 500, 0, tenantId);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="tenant-${tenantId}-evidence.zip"`,
      );

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err: any) => {
        logger.error('Archive error', err);
        res.status(500).end(`Archive error: ${err.message}`);
      });
      archive.pipe(res);

      const actorId = authReq.user?.id || 'unknown';
      const metadata = {
        tenantId,
        exportedAt: new Date().toISOString(),
        actorId,
        eventCount: events.length,
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
      archive.append(JSON.stringify(events, null, 2), { name: 'events.json' });

      const bundleHash = createHash('sha256')
        .update(JSON.stringify({ metadata, events }))
        .digest('hex');

      archive.append(
        JSON.stringify(
          {
            receipt: buildReceipt('TENANT_EVIDENCE_EXPORTED', tenantId, actorId),
            bundleHash,
          },
          null,
          2,
        ),
        { name: 'receipt.json' },
      );

      await archive.finalize();
    } catch (error: any) {
      logger.error('Error in GET /api/tenants/:id/audit/export:', error);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },
);

export default router;
