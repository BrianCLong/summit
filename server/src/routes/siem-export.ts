import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  siemExportService,
  SIEMExportRequest,
  SecurityCategory
} from '../integrations/siem/siem-export.service.js';
import { tenantHeader } from '../middleware/tenantHeader.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import logger from '../utils/logger.js';

const router = Router();

// Apply middleware
router.use(tenantHeader());
router.use(ensureAuthenticated);

/**
 * Pull-based SIEM export
 * GET /api/v1/siem/export/signals
 *
 * Query security signals within a time range
 */
const querySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  category: z.enum([
    'Authentication',
    'Authorization',
    'DataAccess',
    'PolicyViolation',
    'RateLimiting',
    'Anomaly',
    'SystemIntegrity'
  ]).optional(),
  minSeverity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
  cursor: z.string().optional()
});

router.get(
  '/signals',
  requirePermission('siem:export:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;

      // Validate query parameters
      const params = querySchema.parse(req.query);

      const request: SIEMExportRequest = {
        tenantId,
        startTime: new Date(params.startTime),
        endTime: new Date(params.endTime),
        category: params.category as SecurityCategory | undefined,
        minSeverity: params.minSeverity,
        limit: params.limit,
        cursor: params.cursor
      };

      // Enforce maximum time range (30 days)
      const maxRangeMs = 30 * 24 * 60 * 60 * 1000;
      const rangeMs = request.endTime.getTime() - request.startTime.getTime();
      if (rangeMs > maxRangeMs) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TIME_RANGE',
            message: 'Time range cannot exceed 30 days',
            requestId: (req as any).requestId
          }
        });
      }

      const result = await siemExportService.querySecuritySignals(request);

      // Audit log the export
      logger.info('SIEM export query executed', {
        tenantId,
        startTime: params.startTime,
        endTime: params.endTime,
        signalCount: result.signals.length,
        requestId: (req as any).requestId
      });

      res.json(result);
    } catch (error: any) {
      logger.error('SIEM export query failed', {
        error: error.message,
        requestId: (req as any).requestId
      });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Invalid query parameters',
            details: error.errors,
            requestId: (req as any).requestId
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export security signals',
          requestId: (req as any).requestId
        }
      });
    }
  }
);

/**
 * Get SIEM export statistics
 * GET /api/v1/siem/export/stats
 */
router.get(
  '/stats',
  requirePermission('siem:export:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;

      // Query statistics from audit events
      const result = await (req as any).db.query(
        `
        SELECT
          COUNT(*) as total_events,
          COUNT(DISTINCT DATE(timestamp)) as active_days,
          COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_events,
          COUNT(CASE WHEN level = 'high' THEN 1 END) as high_events,
          MIN(timestamp) as earliest_event,
          MAX(timestamp) as latest_event
        FROM audit.events
        WHERE tenant_id = $1 AND compliance_relevant = true
        `,
        [tenantId]
      );

      res.json({
        schemaVersion: '1.0.0',
        tenantId,
        statistics: result.rows[0]
      });
    } catch (error: any) {
      logger.error('SIEM stats query failed', {
        error: error.message,
        requestId: (req as any).requestId
      });

      res.status(500).json({
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to retrieve SIEM statistics',
          requestId: (req as any).requestId
        }
      });
    }
  }
);

/**
 * Health check endpoint
 * GET /api/v1/siem/export/health
 */
router.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'siem-export',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
