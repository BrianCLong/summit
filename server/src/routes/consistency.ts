
import express from 'express';
import { getPostgresPool, getNeo4jDriver } from '../config/database.js';
import { GraphConsistencyService } from '../services/consistency/GraphConsistencyService.js';
import { ConsistencyStore } from '../services/consistency/ConsistencyStore.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/reports', async (req, res) => {
  try {
    const store = new ConsistencyStore();
    // Fetch cached reports which are updated by the background worker
    const reports = await store.getReports();
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/check/:investigationId', async (req, res) => {
  try {
    const pg = getPostgresPool();
    const neo4j = getNeo4jDriver();
    const service = new GraphConsistencyService(pg, neo4j);

    const investigationId = req.params.investigationId;
    const { rows } = await pg.query('SELECT tenant_id FROM investigations WHERE id = $1', [investigationId]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Investigation not found' });
    }

    const tenantId = rows[0].tenant_id;
    // Real-time check for specific investigation is allowed
    const report = await service.checkInvestigation(investigationId, tenantId);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/repair/:investigationId', async (req, res) => {
  try {
    const pg = getPostgresPool();
    const neo4j = getNeo4jDriver();
    const service = new GraphConsistencyService(pg, neo4j);

    const investigationId = req.params.investigationId;
    const { rows } = await pg.query('SELECT tenant_id FROM investigations WHERE id = $1', [investigationId]);

    if (rows.length === 0) {
        return res.status(404).json({ error: 'Investigation not found' });
    }

    const tenantId = rows[0].tenant_id;
    const report = await service.repairInvestigation(investigationId, tenantId);

    // Optionally update cache, but better to let worker do it or do partial update
    // For now, we just return the result.
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
