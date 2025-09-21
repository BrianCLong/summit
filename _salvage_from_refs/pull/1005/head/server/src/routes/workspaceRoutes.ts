import { Router } from 'express';
import { z } from 'zod';
import { createWorkspace, listWorkspaces, addMember, getWorkspace } from '../services/workspaceService.js';

const router = Router();

router.get('/workspaces', (_req, res) => {
  res.json(listWorkspaces());
});

router.get('/workspaces/:id', (req, res) => {
  const ws = getWorkspace(req.params.id);
  if (!ws) {
    return res.status(404).json({ error: 'workspace not found' });
  }
  res.json(ws);
});

router.post('/workspaces', (req, res) => {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'name required' });
  }
  const ws = createWorkspace(parsed.data.name);
  res.status(201).json(ws);
});

router.post('/workspaces/:id/members', (req, res) => {
  const schema = z.object({ userId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'userId required' });
  }
  const ws = addMember(req.params.id, parsed.data.userId);
  if (!ws) {
    return res.status(404).json({ error: 'workspace not found' });
  }
  res.json(ws);
});

export default router;
