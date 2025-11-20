/**
 * Warrant Management API Routes
 *
 * RESTful endpoints for warrant lifecycle management
 */

import { Router } from 'express';
import { WarrantService } from '../services/WarrantService';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system';
import { authenticateUser, requirePermission } from '../middleware/auth';
import { Logger } from 'pino';

export function createWarrantRoutes(
  warrantService: WarrantService,
  auditSystem: AdvancedAuditSystem,
  logger: Logger,
): Router {
  const router = Router();

  /**
   * Create a new warrant
   * POST /api/warrants
   * Requires: admin or compliance_officer role
   */
  router.post(
    '/',
    authenticateUser,
    requirePermission('warrant:create'),
    async (req, res, next) => {
      try {
        const {
          warrantNumber,
          warrantType,
          issuingAuthority,
          issuedDate,
          expiryDate,
          jurisdiction,
          scopeDescription,
          scopeConstraints,
        } = req.body;

        const user = (req as any).user;

        // Validate required fields
        if (!warrantNumber || !warrantType || !issuingAuthority || !jurisdiction) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['warrantNumber', 'warrantType', 'issuingAuthority', 'jurisdiction'],
          });
        }

        // Create warrant
        const warrant = await warrantService.createWarrant({
          warrantNumber,
          warrantType,
          issuingAuthority,
          issuedDate: new Date(issuedDate),
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          jurisdiction,
          scopeDescription,
          scopeConstraints: scopeConstraints || {},
          tenantId: user.tenant,
          createdBy: user.id,
        });

        // Audit log
        await auditSystem.recordEvent({
          eventType: 'resource_modify',
          level: 'info',
          correlationId: (req as any).requestId,
          sessionId: (req as any).sessionId,
          requestId: (req as any).requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'warrant-api',
          resourceType: 'warrant',
          resourceId: warrant.id,
          action: 'create_warrant',
          outcome: 'success',
          message: `Warrant ${warrantNumber} created`,
          details: {
            warrantNumber,
            warrantType,
            issuingAuthority,
            jurisdiction,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2'],
        });

        res.status(201).json({
          warrant,
          message: 'Warrant created successfully',
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get warrant by ID
   * GET /api/warrants/:id
   */
  router.get(
    '/:id',
    authenticateUser,
    requirePermission('warrant:read'),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const user = (req as any).user;

        const warrant = await warrantService.getWarrant(id);

        if (!warrant) {
          return res.status(404).json({ error: 'Warrant not found' });
        }

        // Check tenant access
        if (warrant.tenantId !== user.tenant && !user.roles.includes('super_admin')) {
          return res.status(403).json({ error: 'Access denied to this warrant' });
        }

        res.json({ warrant });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Search warrants
   * GET /api/warrants?status=active&type=search_warrant&limit=50
   */
  router.get(
    '/',
    authenticateUser,
    requirePermission('warrant:read'),
    async (req, res, next) => {
      try {
        const user = (req as any).user;
        const {
          status,
          warrantType,
          jurisdiction,
          searchText,
          issuedAfter,
          expiringBefore,
          limit = 50,
          offset = 0,
        } = req.query;

        const searchParams = {
          tenantId: user.tenant,
          status: status as string,
          warrantType: warrantType as string,
          jurisdiction: jurisdiction as string,
          searchText: searchText as string,
          issuedAfter: issuedAfter ? new Date(issuedAfter as string) : undefined,
          expiringBefore: expiringBefore ? new Date(expiringBefore as string) : undefined,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        };

        const result = await warrantService.searchWarrants(searchParams);

        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * List active warrants
   * GET /api/warrants/active
   */
  router.get(
    '/status/active',
    authenticateUser,
    requirePermission('warrant:read'),
    async (req, res, next) => {
      try {
        const user = (req as any).user;
        const warrants = await warrantService.listActiveWarrants(user.tenant);

        res.json({ warrants, count: warrants.length });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Validate warrant
   * POST /api/warrants/:id/validate
   */
  router.post(
    '/:id/validate',
    authenticateUser,
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { resourceType, operation, purpose, sensitivity, jurisdiction } = req.body;

        const validation = await warrantService.validateWarrant(id, {
          resourceType,
          operation,
          purpose,
          sensitivity,
          jurisdiction,
        });

        res.json({
          warrantId: id,
          validation,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get warrant usage history
   * GET /api/warrants/:id/usage
   */
  router.get(
    '/:id/usage',
    authenticateUser,
    requirePermission('warrant:read'),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        const usage = await warrantService.getWarrantUsage(
          id,
          parseInt(limit as string),
          parseInt(offset as string),
        );

        const stats = await warrantService.getWarrantUsageStats(id);

        res.json({
          usage,
          stats,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Revoke warrant
   * POST /api/warrants/:id/revoke
   */
  router.post(
    '/:id/revoke',
    authenticateUser,
    requirePermission('warrant:revoke'),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = (req as any).user;

        await warrantService.revokeWarrant(id, user.id, reason);

        // Audit log
        await auditSystem.recordEvent({
          eventType: 'resource_modify',
          level: 'warn',
          correlationId: (req as any).requestId,
          sessionId: (req as any).sessionId,
          requestId: (req as any).requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'warrant-api',
          resourceType: 'warrant',
          resourceId: id,
          action: 'revoke_warrant',
          outcome: 'success',
          message: `Warrant revoked`,
          details: { reason },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2'],
        });

        res.json({
          success: true,
          message: 'Warrant revoked successfully',
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Extend warrant expiry
   * POST /api/warrants/:id/extend
   */
  router.post(
    '/:id/extend',
    authenticateUser,
    requirePermission('warrant:update'),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { newExpiryDate } = req.body;
        const user = (req as any).user;

        if (!newExpiryDate) {
          return res.status(400).json({ error: 'newExpiryDate is required' });
        }

        await warrantService.extendWarrant(id, new Date(newExpiryDate), user.id);

        // Audit log
        await auditSystem.recordEvent({
          eventType: 'resource_modify',
          level: 'info',
          correlationId: (req as any).requestId,
          sessionId: (req as any).sessionId,
          requestId: (req as any).requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'warrant-api',
          resourceType: 'warrant',
          resourceId: id,
          action: 'extend_warrant',
          outcome: 'success',
          message: `Warrant expiry extended`,
          details: { newExpiryDate },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2'],
        });

        res.json({
          success: true,
          message: 'Warrant expiry extended successfully',
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get expiring warrants
   * GET /api/warrants/expiring?days=30
   */
  router.get(
    '/status/expiring',
    authenticateUser,
    requirePermission('warrant:read'),
    async (req, res, next) => {
      try {
        const { days = 30 } = req.query;
        const warrants = await warrantService.getExpiringWarrants(parseInt(days as string));

        res.json({
          warrants,
          count: warrants.length,
          daysAhead: parseInt(days as string),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
