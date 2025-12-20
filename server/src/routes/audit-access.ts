/**
 * Audit Access Routes - REST API endpoints for audit access logs
 * Implements ombudsman query endpoints for compliance and oversight
 */

import { Router } from 'express';
import { getPostgresPool } from '../db/postgres.js';
import { AuditAccessLogRepo, AuditQuery, LegalBasis } from '../repos/AuditAccessLogRepo.js';
import logger from '../config/logger.js';

const routeLogger = logger.child({ name: 'AuditAccessRoutes' });

export const auditAccessRouter = Router();

/**
 * Helper to extract tenant from request
 */
function getTenantId(req: any): string | null {
  return String(
    req.headers['x-tenant-id'] || req.headers['x-tenant'] || '',
  ) || null;
}

/**
 * GET /api/audit-access/cases/:caseId - Get audit logs for a specific case
 */
auditAccessRouter.get('/cases/:caseId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const { caseId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    const logs = await repo.getLogsForCase(caseId, tenantId, limit);

    routeLogger.info(
      { caseId, tenantId, logCount: logs.length },
      'Audit logs retrieved for case',
    );

    res.json({
      caseId,
      totalLogs: logs.length,
      logs,
    });
  } catch (error) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to get case audit logs',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/audit-access/users/:userId - Get audit logs for a specific user
 */
auditAccessRouter.get('/users/:userId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    const logs = await repo.getLogsForUser(userId, tenantId, limit);

    routeLogger.info(
      { userId, tenantId, logCount: logs.length },
      'Audit logs retrieved for user',
    );

    res.json({
      userId,
      totalLogs: logs.length,
      logs,
    });
  } catch (error) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to get user audit logs',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/audit-access/query - Advanced query endpoint for ombudsman
 */
auditAccessRouter.post('/query', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const query: AuditQuery = {
      tenantId,
      caseId: req.body.caseId,
      userId: req.body.userId,
      action: req.body.action,
      legalBasis: req.body.legalBasis as LegalBasis,
      startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
      endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      warrantId: req.body.warrantId,
      correlationId: req.body.correlationId,
      limit: req.body.limit || 100,
      offset: req.body.offset || 0,
    };

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    const logs = await repo.query(query);
    const totalCount = await repo.count(query);

    routeLogger.info(
      { tenantId, filters: query, logCount: logs.length },
      'Audit logs queried',
    );

    res.json({
      totalCount,
      returnedCount: logs.length,
      offset: query.offset || 0,
      limit: query.limit || 100,
      logs,
    });
  } catch (error) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to query audit logs',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/audit-access/correlation/:correlationId - Get logs by correlation ID
 */
auditAccessRouter.get('/correlation/:correlationId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const { correlationId } = req.params;

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    const logs = await repo.getLogsByCorrelationId(correlationId, tenantId);

    routeLogger.info(
      { correlationId, tenantId, logCount: logs.length },
      'Audit logs retrieved by correlation ID',
    );

    res.json({
      correlationId,
      totalLogs: logs.length,
      logs,
    });
  } catch (error) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to get correlated audit logs',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/audit-access/verify-integrity - Verify audit trail integrity
 */
auditAccessRouter.post('/verify-integrity', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const startDate = req.body.startDate
      ? new Date(req.body.startDate)
      : undefined;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    const result = await repo.verifyIntegrity(tenantId, startDate, endDate);

    routeLogger.info(
      {
        tenantId,
        valid: result.valid,
        totalLogs: result.totalLogs,
        invalidLogs: result.invalidLogs.length,
      },
      'Audit trail integrity verified',
    );

    res.json(result);
  } catch (error) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to verify integrity',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/audit-access/stats - Get audit statistics
 */
auditAccessRouter.get('/stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    // Get counts by action type
    const actionStats = await pg.query(
      `SELECT action, COUNT(*) as count
       FROM maestro.audit_access_logs
       WHERE tenant_id = $1
       GROUP BY action
       ORDER BY count DESC`,
      [tenantId],
    );

    // Get counts by legal basis
    const legalBasisStats = await pg.query(
      `SELECT legal_basis, COUNT(*) as count
       FROM maestro.audit_access_logs
       WHERE tenant_id = $1
       GROUP BY legal_basis
       ORDER BY count DESC`,
      [tenantId],
    );

    // Get total count
    const totalCount = await repo.count({ tenantId });

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await repo.count({
      tenantId,
      startTime: yesterday,
    });

    res.json({
      totalLogs: totalCount,
      recentLogs24h: recentCount,
      byAction: actionStats.rows,
      byLegalBasis: legalBasisStats.rows,
    });
  } catch (error) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to get audit stats',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

export default auditAccessRouter;
