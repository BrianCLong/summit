import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { executorsRepo } from './executors-repo.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated); // Ensure all routes require authentication

const ExecCreate = z.object({
  name: z.string().min(3).max(64),
  kind: z.enum(['cpu', 'gpu']),
  labels: z.array(z.string().min(1).max(32)).default([]),
  capacity: z.number().int().min(1).max(1024).default(1),
  status: z.enum(['ready', 'busy', 'offline']).default('ready'),
});

router.get(
  '/executors',
  requirePermission('executor:read'),
  async (req: Request, res: Response) => {
    const tenantId = (req.user as { tenantId?: string })?.tenantId || 'default';
    const list = await executorsRepo.list(tenantId);
    res.json(list);
  },
);

router.post(
  '/executors',
  requirePermission('executor:update'),
  async (req: Request, res: Response) => {
    const parse = ExecCreate.safeParse(req.body || {});
    if (!parse.success)
      return res
        .status(400)
        .json({ error: 'invalid_input', details: parse.error.issues });
    const tenantId = (req.user as { tenantId?: string })?.tenantId || 'default';
    const created = await executorsRepo.create(parse.data, tenantId);
    res.status(201).json(created);
  },
);

export default router;
