/**
 * Audit & Compliance API Routes
 *
 * Endpoints for querying audit logs and generating compliance reports
 */

import { Router } from 'express';
import { AdvancedAuditSystem, AuditQuery, ComplianceFramework } from '../audit/advanced-audit-system';
import { authenticateUser, requirePermission } from '../middleware/auth';
import { Logger } from 'pino';

export function createAuditRoutes(
  auditSystem: AdvancedAuditSystem,
  logger: Logger,
): Router {
  const router = Router();

  /**
   * Query audit events
   * POST /api/audit/query
   */
  router.post(
    '/query',
    authenticateUser,
    requirePermission('audit:read'),
    async (req, res, next) => {
      try {
        const user = (req as any).user;
        const {
          startTime,
          endTime,
          eventTypes,
          levels,
          userIds,
          resourceTypes,
          correlationIds,
          complianceFrameworks,
          limit = 100,
          offset = 0,
        } = req.body;

        // Build query
        const query: AuditQuery = {
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
          eventTypes,
          levels,
          userIds,
          tenantIds: [user.tenant],
          resourceTypes,
          correlationIds,
          complianceFrameworks,
          limit: Math.min(limit, 1000),
          offset,
        };

        const events = await auditSystem.queryEvents(query);

        res.json({
          events,
          pagination: {
            limit: query.limit,
            offset: query.offset,
            count: events.length,
          },
        });
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to query audit events');
        next(error);
      }
    },
  );

  /**
   * Generate compliance report
   * POST /api/audit/compliance-report
   */
  router.post(
    '/compliance-report',
    authenticateUser,
    requirePermission('compliance:read'),
    async (req, res, next) => {
      try {
        const { framework, startDate, endDate } = req.body;

        const report = await auditSystem.generateComplianceReport(
          framework as ComplianceFramework,
          new Date(startDate),
          new Date(endDate),
        );

        res.json({ report });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Verify audit trail integrity
   * POST /api/audit/verify-integrity
   */
  router.post(
    '/verify-integrity',
    authenticateUser,
    requirePermission('audit:admin'),
    async (req, res, next) => {
      try {
        const { startDate, endDate } = req.body;

        const verification = await auditSystem.verifyIntegrity(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );

        res.json({ verification });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
