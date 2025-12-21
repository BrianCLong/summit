import express from 'express';
import { ToilService } from '../services/ToilService.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const logToilSchema = z.object({
  category: z.enum(['interrupt', 'manual_task', 'alert', 'meeting', 'other']),
  description: z.string().optional(),
  durationMinutes: z.number().min(1),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
});

const exceptionSchema = z.object({
  processName: z.string().min(1),
  owner: z.string().min(1),
  justification: z.string().min(10),
  expiryDate: z.string().datetime(), // ISO date string
});

router.post('/log', async (req, res, next) => {
  try {
    const { user } = req as any;
    if (!user?.tenant_id) {
      return res.status(400).json({ error: 'Tenant ID missing from context' });
    }
    const validated = logToilSchema.parse(req.body);

    const entry = await ToilService.getInstance().logToil({
      userId: user?.id,
      tenantId: user.tenant_id,
      ...validated,
    });

    res.json(entry);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const { user } = req as any;
    if (!user?.tenant_id) {
      return res.status(400).json({ error: 'Tenant ID missing from context' });
    }
    const stats = await ToilService.getInstance().getStats(user.tenant_id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.post('/exceptions', async (req, res, next) => {
  try {
    const { user } = req as any;
    if (!user?.tenant_id) {
      return res.status(400).json({ error: 'Tenant ID missing from context' });
    }
    const validated = exceptionSchema.parse(req.body);

    const exception = await ToilService.getInstance().registerException({
      tenantId: user.tenant_id,
      ...validated,
    });

    res.json(exception);
  } catch (error) {
    next(error);
  }
});

router.get('/exceptions', async (req, res, next) => {
  try {
    const { user } = req as any;
    if (!user?.tenant_id) {
      return res.status(400).json({ error: 'Tenant ID missing from context' });
    }
    const exceptions = await ToilService.getInstance().getExceptions(user.tenant_id);
    res.json(exceptions);
  } catch (error) {
    next(error);
  }
});

export default router;
