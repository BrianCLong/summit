import { randomUUID } from 'crypto';
import express from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { emitAuditEvent } from '../../audit/emit.js';
import { emitBrandPackReceipt } from '../../provenance/brand-pack-receipt.js';
import { BrandPackService } from './brand-pack.service.js';

const router = express.Router();
const service = BrandPackService.getInstance();
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';
const singleQuery = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const querySchema = z.object({
  partnerId: z.string().optional(),
});

const applySchema = z.object({
  packId: z.string().min(1),
  partnerId: z.string().optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  reason: z.string().optional(),
});

router.get('/tenants/:tenantId', ensureAuthenticated, async (req, res) => {
  try {
    const tenantId = singleParam(req.params.tenantId);
    const partnerId = singleQuery(req.query.partnerId as string | string[] | undefined);
    querySchema.parse({ partnerId });
    const resolution = await service.getBrandPack(tenantId, partnerId);

    res.json({
      tenantId,
      partnerId,
      assignment: resolution.assignment,
      pack: resolution.pack,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load brand pack' });
  }
});

router.post('/tenants/:tenantId/apply', ensureAuthenticated, async (req, res) => {
  try {
    const tenantId = singleParam(req.params.tenantId);
    const payload = applySchema.parse(req.body);
    const actorId =
      payload.actorId ?? (req as any).user?.id ?? 'system';
    const actorName = payload.actorName ?? (req as any).user?.name;
    const appliedAt = new Date().toISOString();

    const resolution = await service.applyBrandPack(
      tenantId,
      payload.packId,
      payload.partnerId,
    );

    const receipt = await emitBrandPackReceipt({
      tenantId,
      packId: payload.packId,
      actorId,
      appliedAt,
    });

    const receiptQueryPath = `/api/receipts/${receipt.id}`;

    const auditEventId = await emitAuditEvent(
      {
        eventId: randomUUID(),
        occurredAt: appliedAt,
        actor: {
          type: 'user',
          id: actorId,
          name: actorName,
          ipAddress: req.ip,
        },
        action: {
          type: 'brand-pack.apply',
          name: 'Brand pack applied',
          outcome: 'success',
        },
        target: {
          type: 'brand-pack',
          id: payload.packId,
          name: resolution.pack.name,
          path: `/api/brand-packs/tenants/${tenantId}`,
        },
        tenantId,
        traceId: req.headers['x-request-id'] as string | undefined,
        metadata: {
          partnerId: payload.partnerId,
          reason: payload.reason,
          receiptId: receipt.id,
          receiptQueryPath,
          appliedAt,
        },
      },
      {
        level: 'info',
        complianceRelevant: true,
        complianceFrameworks: ['SOC2', 'ISO27001'],
        serviceId: 'brand-packs',
      },
    );

    res.json({
      tenantId,
      partnerId: payload.partnerId,
      assignment: resolution.assignment,
      pack: resolution.pack,
      receipt,
      receiptQueryPath,
      auditEventId,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to apply brand pack' });
  }
});

export default router;
