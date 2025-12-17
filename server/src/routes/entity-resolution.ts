import express from 'express';
import { EntityResolutionService } from '../services/entity-resolution/service';
import { DataQualityService } from '../services/entity-resolution/quality';

const router = express.Router();
const erService = new EntityResolutionService();
const dqService = new DataQualityService();

// Batch Resolution Endpoint
router.post('/resolve-batch', async (req, res) => {
  try {
    const { entities } = req.body;
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'Entities must be an array' });
    }

    // Inject tenantId from authenticated user context if not present on entities
    // Assuming req.user is populated by auth middleware
    const tenantId = (req as any).user?.tenantId;

    const enrichedEntities = entities.map(e => ({
        ...e,
        tenantId: e.tenantId || tenantId
    }));

    if (enrichedEntities.some(e => !e.tenantId)) {
        return res.status(400).json({ error: 'Tenant ID missing on some entities' });
    }

    const decisions = await erService.resolveBatch(enrichedEntities);
    res.json({ decisions });
  } catch (error) {
    console.error('Batch resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Data Quality Metrics Endpoint
router.get('/quality/metrics', async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
    }

    const metrics = await dqService.getQualityMetrics(tenantId);
    res.json({ metrics });
  } catch (error) {
    console.error('Quality metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
