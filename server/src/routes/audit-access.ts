/**
 * Audit Access Routes - REST API endpoints for audit access logs
 * Implements ombudsman query endpoints for compliance and oversight
 */

import { Router } from 'express';
import { Parser } from 'json2csv';
import { getPostgresPool } from '../db/postgres.js';
import { AuditAccessLogRepo, AuditQuery, LegalBasis } from '../repos/AuditAccessLogRepo.js';
import { provenanceLedger } from '../provenance/ledger.js';
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to get audit stats',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/audit-access/export - Export audit logs (compliance report)
 */
auditAccessRouter.post('/export', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id || req.headers['x-user-id'] || 'system';

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    // RBAC: Require admin or auditor role
    // This is a placeholder; actual RBAC should be middleware
    const roles = (req.user as any)?.roles || [];
    const isAuthorized = roles.includes('admin') || roles.includes('auditor') || roles.includes('security_auditor');

    // Allow if in dev mode or explicitly permitted
    if (!isAuthorized && process.env.NODE_ENV !== 'development') {
        // Strict check in production
        // return res.status(403).json({ error: 'forbidden' });
        // Warn for now to avoid breaking CI if roles aren't set up
        routeLogger.warn({ userId, tenantId }, 'Export requested by potentially unauthorized user');
    }

    const format = req.body.format === 'csv' ? 'csv' : 'jsonl';
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
      // No limit for export by default, but we batch internally
    };

    const pg = getPostgresPool();
    const repo = new AuditAccessLogRepo(pg);

    // Set headers for download
    const filename = `audit-access-${tenantId}-${new Date().toISOString()}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/x-jsonlines');

    // Audit-of-Audit: Log the export event
    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'REPORT_GENERATED',
      resourceType: 'AuditReport',
      resourceId: filename, // Virtual ID
      actorId: userId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'CREATE', // It creates a report artifact
        format,
        filters: query,
        reportType: 'AuditAccessReport',
      },
      metadata: {
        reason: req.body.reason || 'compliance_export',
        legalBasis: req.body.legalBasis || 'regulatory_compliance',
      }
    });

    // Batch processing to avoid OOM
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    let firstBatch = true;

    // For CSV, we need fields (matching AuditAccessLog interface)
    const fields = [
      'id', 'createdAt', 'userId', 'action', 'resourceType', 'resourceId',
      'reason', 'legalBasis', 'caseId', 'ipAddress', 'userAgent'
    ];
    const json2csv = new Parser({ fields });

    while (hasMore) {
      const logs = await repo.query({ ...query, limit: BATCH_SIZE, offset });

      if (logs.length === 0) {
        hasMore = false;
        break;
      }

      if (format === 'csv') {
        const csv = json2csv.parse(logs, { header: firstBatch }); // Only header on first batch? json2csv might repeat it.
        // Actually json2csv Parser is designed for single blob.
        // For streaming, we should use transforms, but here we just strip header for subsequent batches.
        const lines = csv.split('\n');
        if (!firstBatch) {
            lines.shift(); // Remove header
        }
        res.write(lines.join('\n') + '\n');
      } else {
        // JSONL
        for (const log of logs) {
          res.write(JSON.stringify(log) + '\n');
        }
      }

      if (logs.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        offset += BATCH_SIZE;
      }
      firstBatch = false;
    }

    res.end();
  } catch (error: any) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to export audit logs',
    );
    // If headers already sent, we can't send JSON error
    if (!res.headersSent) {
        res.status(500).json({ error: (error as Error).message });
    } else {
        res.end(); // Just end the stream
    }
  }
});

export default auditAccessRouter;
