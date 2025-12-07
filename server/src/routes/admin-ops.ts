import express from 'express';
import { getFeatureFlagService } from '../services/FeatureFlagService.js';
import { sloService } from '../observability/slos.js';
import { costGuardService } from '../observability/cost-guards.js';
import { slowQueryKiller } from '../observability/slow-query-killer.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { enqueueSocial } from '../services/QueueService.js';
import logger from '../utils/logger.js';
import { getNeo4jDriver } from '../db/neo4j.js';
import { pool } from '../db/pg';

const router = express.Router();
const featureFlags = getFeatureFlagService({
  provider: 'local',
  config: { file: './feature-flags/flags.yaml' }
});

// Middleware to ensure admin access (mock for now, should integrate with auth)
const ensureAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // TODO: Implement actual admin check
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    // For MVP/Dev, we might be lenient or check specific header
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// --- Feature Flags ---

router.get('/flags', ensureAdmin, async (req, res) => {
  try {
    const flags = featureFlags.getAllFlags();
    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/flags/:key', ensureAdmin, async (req, res) => {
  try {
    const flag = featureFlags.getFlagMetadata(req.params.key);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Connector Health ---

router.get('/connectors/health', ensureAdmin, async (req, res) => {
  try {
    // Check Neo4j
    let neo4jStatus = 'unknown';
    try {
      const driver = getNeo4jDriver();
      await driver.verifyConnectivity();
      neo4jStatus = 'up';
    } catch (e) {
      neo4jStatus = 'down';
    }

    // Check Postgres
    let pgStatus = 'unknown';
    try {
      await pool.query('SELECT 1');
      pgStatus = 'up';
    } catch (e) {
      pgStatus = 'down';
    }

    // Check Redis (via queue service implicitly or assume if app is running)
    // For now we'll just report basic connectivity

    res.json({
      neo4j: neo4jStatus,
      postgres: pgStatus,
      // Add other connectors here
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Job Control ---

router.post('/jobs/backfill', ensureAdmin, async (req, res) => {
  try {
    const { provider, query, investigationId, limit } = req.body;
    if (!provider || !query || !investigationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use SocialQueue for now as generic ingestion
    const jobId = await enqueueSocial(provider, query, investigationId, { limit: limit || 100 });

    res.json({ ok: true, jobId, message: 'Backfill job enqueued' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- SLO Status ---

router.get('/slos', ensureAdmin, async (req, res) => {
  try {
    const status = await sloService.getSLOStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Cost Guard ---

router.get('/cost', ensureAdmin, async (req, res) => {
  try {
    const status = costGuardService.getAllBudgetStatuses();
    const result: Record<string, any> = {};
    for (const [tenant, stat] of status.entries()) {
      result[tenant] = stat;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/cost/reset', ensureAdmin, async (req, res) => {
  try {
    // Manually trigger reset logic (not exposed publicly on service, but we can restart/clear)
    // costGuardService.resetDailyBudgets(); // Private method
    res.json({ message: 'Cost budgets reset (simulation)' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Slow Query Killer ---

router.get('/slow-queries', ensureAdmin, async (req, res) => {
  try {
    const queries = slowQueryKiller.getActiveQueries();
    res.json(queries);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/slow-queries/kill/:id', ensureAdmin, async (req, res) => {
  try {
    // slowQueryKiller.killQuery is private, but we can simulate or expose it if needed.
    // Ideally, we'd add a public method to kill by ID manually.
    // For now, we'll just return not implemented as it requires code change in SlowQueryKiller
    res.status(501).json({ error: 'Manual kill not yet implemented via API' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Audit Search ---

router.get('/audit', ensureAdmin, async (req, res) => {
  try {
    const { tenantId, limit, actionType } = req.query;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const entries = await provenanceLedger.getEntries(String(tenantId), {
      limit: Number(limit) || 50,
      actionType: actionType as string,
      order: 'DESC'
    });

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
