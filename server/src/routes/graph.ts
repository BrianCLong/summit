// @ts-nocheck
import express, { Request, Response, NextFunction } from 'express';
import { Neo4jGraphService } from '../services/GraphService.js';
import { Neo4jGraphAnalyticsService } from '../services/GraphAnalyticsService.js';
import { GraphPatternService } from '../services/GraphPatternService.js';
import { InvestigationSessionService } from '../services/InvestigationSessionService.js';
import { ensureAuthenticated } from '../middleware/auth.js'; // Assuming this exists based on context
import { TenantId } from '../graph/types.js';
import logger from '../utils/logger.js';
import { provenanceLedger } from '../provenance/ledger.js';
import QuotaManager from '../lib/resources/quota-manager.js';
import type { AuthenticatedRequest } from './types.js';
import { securityAudit } from '../audit/security-audit-logger.js';

const router = express.Router();

const graphService = Neo4jGraphService.getInstance();
const analyticsService = Neo4jGraphAnalyticsService.getInstance();
const patternService = GraphPatternService.getInstance();
const sessionService = InvestigationSessionService.getInstance();

// Middleware to get tenantId from user
const getTenantId = (req: AuthenticatedRequest): TenantId => {
  // Assuming req.user is populated by ensureAuthenticated and has tenantId
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant ID missing from request context');
  }
  return tenantId;
};

const checkQuota = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Basic quota check placeholder
    const tenantId = req.user?.tenantId;
    if (tenantId) {
        const quota = QuotaManager.getQuotaForTenant(tenantId);
        // Here we would check rate limits or usage counters
        // For MVP, we just log that we checked
        logger.debug('Checking quota for tenant', { tenantId, tier: quota.tier });
    }
    next();
};

// --- Entity & Edge CRUD/Search ---

router.post('/entities/search', ensureAuthenticated, checkQuota, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const query = req.body;

    // Audit Read
    provenanceLedger.appendEntry({
        tenantId,
        actionType: 'graph.entity.search',
        resourceType: 'entity',
        resourceId: 'search_query',
        actorId: req.user!.id,
        actorType: 'user',
        payload: query,
        metadata: { purpose: 'investigation' }
    }).catch(e => logger.error('Failed to audit graph search', e));

    const entities = await graphService.findEntities(tenantId, query);
    res.json({ data: entities });
  } catch (err: any) {
    logger.error('Graph Entity Search Error', err);
    next(err);
  }
});

router.get('/entities/:id', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    securityAudit.logSensitiveRead({
      actor: req.user!.id,
      tenantId,
      resourceType: 'entity',
      resourceId: id,
      action: 'view',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const entity = await graphService.getEntity(tenantId, id);
    if (!entity) {
       res.status(404).json({ error: 'Entity not found' });
       return;
    }
    res.json({ data: entity });
  } catch (err: any) {
    next(err);
  }
});

router.get('/entities/:id/neighbors', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { depth = 1 } = req.query;

    securityAudit.logSensitiveRead({
      actor: req.user!.id,
      tenantId,
      resourceType: 'entity_neighbors',
      resourceId: id,
      action: 'traverse',
      details: { depth: Number(depth) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Use analytics service for k-hop which is essentially neighbors
    const result = await analyticsService.kHopNeighborhoodSafe({
        tenantId,
        seedIds: [id],
        depth: Number(depth)
    });

    res.json({ data: result });
  } catch (err: any) {
    next(err);
  }
});

// --- Pattern Search ---

router.post('/patterns/search', ensureAuthenticated, checkQuota, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { pattern, filters, limit } = req.body;

    // Validate body structure briefly?
    if (!pattern || !pattern.nodes) {
         res.status(400).json({ error: 'Invalid pattern query' });
         return;
    }

    // Audit Pattern Search
    provenanceLedger.appendEntry({
        tenantId,
        actionType: 'graph.pattern.search',
        resourceType: 'graph_pattern',
        resourceId: 'pattern_query',
        actorId: req.user!.id,
        actorType: 'user',
        payload: { pattern, filters },
        metadata: { purpose: 'investigation' }
    }).catch(e => logger.error('Failed to audit pattern search', e));

    const results = await patternService.search({
        tenantId,
        pattern,
        filters,
        limit
    });

    res.json({ data: results });
  } catch (err: any) {
    logger.error('Graph Pattern Search Error', err);
    next(err);
  }
});

// --- Analytics ---

router.post('/analytics/shortest-path', ensureAuthenticated, checkQuota, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { from, to, maxDepth } = req.body;

    provenanceLedger.appendEntry({
        tenantId,
        actionType: 'graph.analytics.shortest_path',
        resourceType: 'analytics_job',
        resourceId: 'shortest_path',
        actorId: req.user!.id,
        actorType: 'user',
        payload: { from, to, maxDepth },
        metadata: { purpose: 'investigation' }
    }).catch(e => logger.error('Failed to audit analytics', e));

    const result = await analyticsService.shortestPath({
        tenantId,
        from,
        to,
        maxDepth
    });

    res.json({ data: result });
  } catch (err: any) {
    next(err);
  }
});

router.post('/analytics/centrality', ensureAuthenticated, checkQuota, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { scope, algorithm } = req.body;

    provenanceLedger.appendEntry({
        tenantId,
        actionType: 'graph.analytics.centrality',
        resourceType: 'analytics_job',
        resourceId: algorithm,
        actorId: req.user!.id,
        actorType: 'user',
        payload: { scope, algorithm },
        metadata: { purpose: 'investigation' }
    }).catch(e => logger.error('Failed to audit analytics', e));

    const result = await analyticsService.centrality({
        tenantId,
        scope: scope || {},
        algorithm
    });

    res.json({ data: result });
  } catch (err: any) {
    next(err);
  }
});

router.post('/analytics/anomalies', ensureAuthenticated, checkQuota, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const { scope, kind } = req.body;

      provenanceLedger.appendEntry({
        tenantId,
        actionType: 'graph.analytics.anomalies',
        resourceType: 'analytics_job',
        resourceId: kind || 'unknown',
        actorId: req.user!.id,
        actorType: 'user',
        payload: { scope, kind },
        metadata: { purpose: 'investigation' }
      }).catch(e => logger.error('Failed to audit analytics', e));

      const result = await analyticsService.detectAnomalies({
          tenantId,
          scope: scope || {},
          kind
      });

      res.json({ data: result });
    } catch (err: any) {
      next(err);
    }
  });

// --- Investigation Sessions ---

router.post('/sessions', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user!.id; // assuming id exists on user
        const { name, graphState, metadata } = req.body;

        if (!name) {
             res.status(400).json({ error: 'Name is required' });
             return;
        }

        const session = await sessionService.createSession(tenantId, name, userId, graphState, metadata);
        res.status(201).json({ data: session });
    } catch (err: any) {
        next(err);
    }
});

router.get('/sessions', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.user!.id;
        const limit = req.query.limit ? Number(req.query.limit) : 20;

        const sessions = await sessionService.listSessions(tenantId, userId, limit);
        res.json({ data: sessions });
    } catch (err: any) {
        next(err);
    }
});

router.get('/sessions/:id', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;

        const session = await sessionService.getSession(tenantId, id);
        if (!session) {
             res.status(404).json({ error: 'Session not found' });
             return;
        }
        res.json({ data: session });
    } catch (err: any) {
        next(err);
    }
});

router.put('/sessions/:id', ensureAuthenticated, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tenantId = getTenantId(req);
        const { id } = req.params;
        const updates = req.body;

        const session = await sessionService.updateSession(tenantId, id, updates);
        if (!session) {
             res.status(404).json({ error: 'Session not found' });
             return;
        }
        res.json({ data: session });
    } catch (err: any) {
        next(err);
    }
});

export default router;
