import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { opaClient } from '../services/opa-client.js';
import { provenanceClient } from '../services/provenance-client.js';

const router = Router();

/**
 * GET /health - Basic health check
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready - Readiness check (all dependencies)
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks = {
    database: await db.isHealthy(),
    opa: await opaClient.isHealthy(),
    provenance: await provenanceClient.isHealthy(),
  };

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    ready: allHealthy,
    checks,
  });
});

/**
 * GET /health/live - Liveness check
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({ live: true });
});

export default router;
