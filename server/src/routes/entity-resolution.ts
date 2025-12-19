import { Router, Request, Response } from 'express';
import { EntityResolver } from '../entity-resolution/engine/EntityResolver.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();
const resolver = new EntityResolver();

// Find potential duplicates
router.post('/find-duplicates', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { entityId, threshold } = req.body;
    const tenantId = (req as any).user.tenantId;

    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    const results = await resolver.findDuplicates(tenantId, entityId, threshold);
    res.json({ results });
  } catch (error: any) {
    console.error('Error in find-duplicates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get merge recommendation
router.post('/recommend-merge', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { entityIds } = req.body;
    const tenantId = (req as any).user.tenantId;

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length !== 2) {
      return res.status(400).json({ error: 'entityIds must be an array of two IDs' });
    }

    const recommendation = await resolver.recommendMerge(tenantId, entityIds[0], entityIds[1]);
    res.json({ recommendation });
  } catch (error: any) {
    console.error('Error in recommend-merge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute merge
router.post('/merge', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { entityIds, strategies, dryRun } = req.body;
    const tenantId = (req as any).user.tenantId;

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length !== 2) {
      return res.status(400).json({ error: 'entityIds must be an array of two IDs' });
    }

    const result = await resolver.merge(tenantId, entityIds[0], entityIds[1], strategies, dryRun);
    res.json({ result });
  } catch (error: any) {
    console.error('Error in merge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch resolution
router.post('/batch', ensureAuthenticated, async (req: Request, res: Response) => {
    // Not implemented in this iteration
    res.status(501).json({ error: 'Batch resolution not implemented' });
});

export default router;
