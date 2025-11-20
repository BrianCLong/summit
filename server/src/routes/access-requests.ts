/**
 * Access Request API Routes
 *
 * Handles access requests (appeals) for denied access
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AdvancedAuditSystem } from '../audit/advanced-audit-system';
import { WarrantService } from '../services/WarrantService';
import { authenticateUser, requirePermission } from '../middleware/auth';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';

interface AccessRequest {
  id: string;
  requesterUserId: string;
  requesterTenantId: string;
  resourceType: string;
  resourceId?: string;
  requestedPurpose: string;
  justification: string;
  requestedOperations: string[];
  requestedSensitivity?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  approvalExpiresAt?: Date;
  grantedWarrantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createAccessRequestRoutes(
  db: Pool,
  auditSystem: AdvancedAuditSystem,
  warrantService: WarrantService,
  logger: Logger,
): Router {
  const router = Router();

  /**
   * Submit access request (appeal)
   * POST /api/access-requests
   */
  router.post(
    '/',
    authenticateUser,
    async (req, res, next) => {
      try {
        const user = (req as any).user;
        const {
          resourceType,
          resourceId,
          requestedPurpose,
          justification,
          requestedOperations,
          requestedSensitivity,
        } = req.body;

        // Validate required fields
        if (!resourceType || !requestedPurpose || !justification) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['resourceType', 'requestedPurpose', 'justification'],
          });
        }

        // Validate justification length
        if (justification.length < 20) {
          return res.status(400).json({
            error: 'Justification must be at least 20 characters',
          });
        }

        const id = randomUUID();

        // Insert access request
        await db.query(
          `
          INSERT INTO access_requests (
            id, requester_user_id, requester_tenant_id, resource_type, resource_id,
            requested_purpose, justification, requested_operations, requested_sensitivity,
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          `,
          [
            id,
            user.id,
            user.tenant,
            resourceType,
            resourceId || null,
            requestedPurpose,
            justification,
            requestedOperations || ['read'],
            requestedSensitivity || null,
            'pending',
          ],
        );

        // Audit log
        await auditSystem.recordEvent({
          eventType: 'approval_request',
          level: 'info',
          correlationId: (req as any).requestId,
          sessionId: (req as any).sessionId,
          requestId: (req as any).requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'access-request-api',
          resourceType,
          resourceId,
          action: 'submit_access_request',
          outcome: 'success',
          message: 'Access request submitted',
          details: {
            accessRequestId: id,
            requestedPurpose,
            requestedOperations,
            requestedSensitivity,
            justification,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
        });

        // TODO: Send notification to compliance officers

        res.status(201).json({
          accessRequestId: id,
          status: 'pending',
          message: 'Access request submitted successfully. A compliance officer will review your request within 24 hours.',
          estimatedResponseTime: '24 hours',
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get access requests (for users: their own, for compliance: all pending)
   * GET /api/access-requests?status=pending&limit=50
   */
  router.get(
    '/',
    authenticateUser,
    async (req, res, next) => {
      try {
        const user = (req as any).user;
        const { status, limit = 50, offset = 0 } = req.query;

        let query: string;
        let params: any[];

        // Compliance officers can see all requests, others only their own
        if (user.roles.includes('compliance_officer') || user.roles.includes('admin')) {
          query = `
            SELECT ar.*, ap.requires_warrant, ap.requires_approval
            FROM access_requests ar
            JOIN access_purposes ap ON ap.purpose_code = ar.requested_purpose
            WHERE ar.requester_tenant_id = $1
          `;
          params = [user.tenant];

          if (status) {
            query += ` AND ar.status = $${params.length + 1}`;
            params.push(status);
          }
        } else {
          query = `
            SELECT ar.*, ap.requires_warrant, ap.requires_approval
            FROM access_requests ar
            JOIN access_purposes ap ON ap.purpose_code = ar.requested_purpose
            WHERE ar.requester_user_id = $1 AND ar.requester_tenant_id = $2
          `;
          params = [user.id, user.tenant];

          if (status) {
            query += ` AND ar.status = $${params.length + 1}`;
            params.push(status);
          }
        }

        query += ` ORDER BY ar.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit as string), parseInt(offset as string));

        const result = await db.query(query, params);

        res.json({
          accessRequests: result.rows.map(deserializeAccessRequest),
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            total: result.rows.length,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get specific access request
   * GET /api/access-requests/:id
   */
  router.get(
    '/:id',
    authenticateUser,
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const user = (req as any).user;

        const result = await db.query(
          `
          SELECT ar.*, ap.requires_warrant, ap.requires_approval
          FROM access_requests ar
          JOIN access_purposes ap ON ap.purpose_code = ar.requested_purpose
          WHERE ar.id = $1
          `,
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Access request not found' });
        }

        const accessRequest = deserializeAccessRequest(result.rows[0]);

        // Check access: requester or compliance officer
        if (
          accessRequest.requesterUserId !== user.id &&
          !user.roles.includes('compliance_officer') &&
          !user.roles.includes('admin')
        ) {
          return res.status(403).json({ error: 'Access denied to this access request' });
        }

        res.json({ accessRequest });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Approve access request
   * POST /api/access-requests/:id/approve
   */
  router.post(
    '/:id/approve',
    authenticateUser,
    requirePermission('access_request:approve'),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { reviewNotes, approvalExpiresAt, grantedWarrantId } = req.body;
        const user = (req as any).user;

        // Get access request
        const result = await db.query(
          'SELECT * FROM access_requests WHERE id = $1',
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Access request not found' });
        }

        const accessRequest = result.rows[0];

        if (accessRequest.status !== 'pending') {
          return res.status(400).json({
            error: `Access request is already ${accessRequest.status}`,
          });
        }

        // Update access request
        await db.query(
          `
          UPDATE access_requests
          SET status = 'approved',
              reviewed_by = $1,
              reviewed_at = NOW(),
              review_notes = $2,
              approval_expires_at = $3,
              granted_warrant_id = $4,
              updated_at = NOW()
          WHERE id = $5
          `,
          [
            user.id,
            reviewNotes,
            approvalExpiresAt ? new Date(approvalExpiresAt) : null,
            grantedWarrantId || null,
            id,
          ],
        );

        // Audit log
        await auditSystem.recordEvent({
          eventType: 'approval_decision',
          level: 'info',
          correlationId: (req as any).requestId,
          sessionId: (req as any).sessionId,
          requestId: (req as any).requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'access-request-api',
          resourceType: accessRequest.resource_type,
          resourceId: accessRequest.resource_id,
          action: 'approve_access_request',
          outcome: 'success',
          message: 'Access request approved',
          details: {
            accessRequestId: id,
            requesterId: accessRequest.requester_user_id,
            reviewNotes,
            approvalExpiresAt,
            grantedWarrantId,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
        });

        // TODO: Send notification to requester

        res.json({
          success: true,
          message: 'Access request approved successfully',
          accessRequestId: id,
          approvalExpiresAt,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Deny access request
   * POST /api/access-requests/:id/deny
   */
  router.post(
    '/:id/deny',
    authenticateUser,
    requirePermission('access_request:approve'),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const { reviewNotes } = req.body;
        const user = (req as any).user;

        if (!reviewNotes) {
          return res.status(400).json({
            error: 'Review notes are required when denying access',
          });
        }

        // Get access request
        const result = await db.query(
          'SELECT * FROM access_requests WHERE id = $1',
          [id],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Access request not found' });
        }

        const accessRequest = result.rows[0];

        if (accessRequest.status !== 'pending') {
          return res.status(400).json({
            error: `Access request is already ${accessRequest.status}`,
          });
        }

        // Update access request
        await db.query(
          `
          UPDATE access_requests
          SET status = 'denied',
              reviewed_by = $1,
              reviewed_at = NOW(),
              review_notes = $2,
              updated_at = NOW()
          WHERE id = $3
          `,
          [user.id, reviewNotes, id],
        );

        // Audit log
        await auditSystem.recordEvent({
          eventType: 'approval_decision',
          level: 'warn',
          correlationId: (req as any).requestId,
          sessionId: (req as any).sessionId,
          requestId: (req as any).requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'access-request-api',
          resourceType: accessRequest.resource_type,
          resourceId: accessRequest.resource_id,
          action: 'deny_access_request',
          outcome: 'success',
          message: 'Access request denied',
          details: {
            accessRequestId: id,
            requesterId: accessRequest.requester_user_id,
            reviewNotes,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
        });

        // TODO: Send notification to requester

        res.json({
          success: true,
          message: 'Access request denied',
          accessRequestId: id,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Get pending access requests count (for compliance officers)
   * GET /api/access-requests/stats/pending
   */
  router.get(
    '/stats/pending',
    authenticateUser,
    requirePermission('access_request:read'),
    async (req, res, next) => {
      try {
        const user = (req as any).user;

        const result = await db.query(
          `
          SELECT COUNT(*) as count
          FROM access_requests
          WHERE status = 'pending' AND requester_tenant_id = $1
          `,
          [user.tenant],
        );

        const count = parseInt(result.rows[0].count);

        res.json({
          pendingCount: count,
          tenantId: user.tenant,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;

  function deserializeAccessRequest(row: any): AccessRequest {
    return {
      id: row.id,
      requesterUserId: row.requester_user_id,
      requesterTenantId: row.requester_tenant_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      requestedPurpose: row.requested_purpose,
      justification: row.justification,
      requestedOperations: row.requested_operations,
      requestedSensitivity: row.requested_sensitivity,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      approvalExpiresAt: row.approval_expires_at,
      grantedWarrantId: row.granted_warrant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
