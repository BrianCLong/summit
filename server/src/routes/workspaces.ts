import express from 'express';
import { workspaceService } from '../services/WorkspaceService.js';
import { logger } from '../config/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.id || (req as any).user?.sub;

  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const workspaces = await workspaceService.getWorkspaces(tenantId, userId);
    res.json(workspaces);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

router.post('/', async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.id || (req as any).user?.sub;
  const { name, config } = req.body;

  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  try {
    const workspace = await workspaceService.createWorkspace(tenantId, userId, name, config || {});
    res.json(workspace);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

router.put('/:id', async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.id || (req as any).user?.sub;
  const { id } = req.params;
  const { name, config } = req.body;

  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const workspace = await workspaceService.updateWorkspace(tenantId, userId, id, { name, config });
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.json(workspace);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

router.delete('/:id', async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.id || (req as any).user?.sub;
  const { id } = req.params;

  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const success = await workspaceService.deleteWorkspace(tenantId, userId, id);
    if (!success) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

export default router;
