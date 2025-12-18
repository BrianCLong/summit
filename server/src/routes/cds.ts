import express from 'express';
import { CrossDomainGuard } from '../cds/CrossDomainGuard.js';
import { EntityRepo } from '../repos/EntityRepo.js';
import { getPostgresPool, getNeo4jDriver } from '../config/database.js';
import { UserSecurityContext } from '../cds/types.js';

const router = express.Router();

// Initialize Repo and Guard
// Note: In a real app, use dependency injection
const pgPool = getPostgresPool();
const neo4jDriver = getNeo4jDriver();
const entityRepo = new EntityRepo(pgPool, neo4jDriver);
const guard = new CrossDomainGuard(entityRepo);

router.post('/transfer', async (req, res) => {
  try {
    const { entityId, sourceDomainId, targetDomainId, justification } = req.body;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Construct User Security Context from JWT/Session
    // This assumes the user object has these fields, or we default them for simulation
    const userContext: UserSecurityContext = {
      userId: user.id,
      clearance: user.clearance || 'TOP_SECRET', // Default for simulation
      nationality: user.nationality || 'USA',
      accessCompartments: user.accessCompartments || [],
      authorizedDomains: user.authorizedDomains || ['high-side', 'low-side'],
    };

    const result = await guard.processTransfer({
      entityId,
      sourceDomainId,
      targetDomainId,
      justification,
      userContext,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(403).json(result);
    }
  } catch (error) {
    console.error('CDS Transfer Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/domains', (req, res) => {
    res.json([
        { id: 'high-side', name: 'High Side (TS/SCI)', classification: 'TOP_SECRET' },
        { id: 'low-side', name: 'Low Side (UNCLASSIFIED)', classification: 'UNCLASSIFIED' }
    ]);
});

export default router;
