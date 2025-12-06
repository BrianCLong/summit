/**
 * Audit Black Box API
 *
 * REST API for searching, exporting, and managing audit events.
 * Implements strict authorization for audit data access.
 *
 * Endpoints:
 * - POST /audit/events - Ingest audit events
 * - GET /audit/events - Search audit events
 * - GET /audit/events/:id - Get single event
 * - POST /audit/export - Export audit report
 * - GET /audit/integrity - Verify integrity
 * - POST /audit/redact - Request redaction (RTBF)
 * - GET /audit/health - Health check
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID, createHash, createHmac } from 'crypto';
import type { Pool } from 'pg';
import type { ImmutableAuditStore } from '../store/immutable-store.js';
import type {
  AuditEvent,
  AuditQuery,
  AuditQueryResult,
  AuditExportReport,
  IntegrityVerificationResult,
  RedactionRequest,
  BlackBoxServiceConfig,
} from '../core/types.js';
import { AuditEventSchema } from '../core/types.js';

/**
 * Authorization context from request
 */
interface AuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

/**
 * Express request with auth context
 */
interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

/**
 * Query parameters schema
 */
const QueryParamsSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  eventTypes: z.string().optional(), // Comma-separated
  levels: z.string().optional(),
  outcomes: z.string().optional(),
  userIds: z.string().optional(),
  serviceIds: z.string().optional(),
  resourceTypes: z.string().optional(),
  resourceIds: z.string().optional(),
  correlationIds: z.string().optional(),
  complianceFrameworks: z.string().optional(),
  complianceRelevant: z.enum(['true', 'false']).optional(),
  legalHold: z.enum(['true', 'false']).optional(),
  searchQuery: z.string().optional(),
  tags: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['timestamp', 'level', 'eventType', 'sequenceNumber']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Export request schema
 */
const ExportRequestSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  eventTypes: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  serviceIds: z.array(z.string()).optional(),
  complianceFrameworks: z.array(z.string()).optional(),
  includeDetails: z.boolean().default(true),
});

/**
 * Redaction request schema
 */
const RedactionRequestSchema = z.object({
  subjectUserId: z.string().min(1),
  reason: z.string().min(10),
  legalBasis: z.string().min(1),
  verificationId: z.string().optional(),
  fieldsToRedact: z.array(z.string()).min(1),
});

/**
 * Create the audit API router
 */
export function createAuditRouter(
  store: ImmutableAuditStore,
  pool: Pool,
  config: BlackBoxServiceConfig,
): Router {
  const router = Router();

  // Middleware to extract auth context (placeholder - integrate with actual auth)
  const extractAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // In production, extract from JWT or session
    // For now, use headers for testing
    const userId = req.headers['x-user-id'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;
    const roles = (req.headers['x-user-roles'] as string || '').split(',').filter(Boolean);
    const permissions = (req.headers['x-user-permissions'] as string || '').split(',').filter(Boolean);

    if (!userId || !tenantId) {
      res.status(401).json({ error: 'Missing authentication' });
      return;
    }

    req.auth = { userId, tenantId, roles, permissions };
    next();
  };

  // Authorization middleware
  const requirePermission = (permission: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.auth) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Admin roles bypass permission checks
      if (req.auth.roles.includes('admin') || req.auth.roles.includes('ombuds')) {
        next();
        return;
      }

      if (!req.auth.permissions.includes(permission)) {
        res.status(403).json({ error: `Missing permission: ${permission}` });
        return;
      }

      next();
    };
  };

  /**
   * Health check endpoint
   */
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      // Check database connectivity
      await pool.query('SELECT 1');

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        currentSequence: store.getCurrentSequence().toString(),
        lastChainHash: store.getLastChainHash(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({
        status: 'unhealthy',
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * Ingest audit events
   * POST /audit/events
   */
  router.post(
    '/events',
    express.json({ limit: '10mb' }),
    extractAuth,
    requirePermission('audit:write'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const events = Array.isArray(req.body) ? req.body : [req.body];
        const results: Array<{ eventId: string; success: boolean; error?: string }> = [];

        for (const eventData of events) {
          try {
            // Validate event
            const validation = AuditEventSchema.safeParse({
              ...eventData,
              tenantId: eventData.tenantId || req.auth!.tenantId,
            });

            if (!validation.success) {
              results.push({
                eventId: eventData.id || 'unknown',
                success: false,
                error: validation.error.message,
              });
              continue;
            }

            // Build full event
            const event: AuditEvent = {
              id: eventData.id || randomUUID(),
              timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
              version: '1.0.0',
              ...validation.data,
            } as AuditEvent;

            // Append to store
            const chainEntry = await store.appendEvent(event);

            results.push({
              eventId: event.id,
              success: true,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            results.push({
              eventId: eventData.id || 'unknown',
              success: false,
              error: message,
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        res.status(failureCount === results.length ? 400 : 201).json({
          success: failureCount === 0,
          total: results.length,
          successful: successCount,
          failed: failureCount,
          results,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * Search audit events
   * GET /audit/events
   */
  router.get(
    '/events',
    extractAuth,
    requirePermission('audit:read'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Parse and validate query params
        const validation = QueryParamsSchema.safeParse(req.query);
        if (!validation.success) {
          res.status(400).json({ error: validation.error.message });
          return;
        }

        const params = validation.data;

        // Build query
        const query: AuditQuery = {
          startTime: params.startTime ? new Date(params.startTime) : undefined,
          endTime: params.endTime ? new Date(params.endTime) : undefined,
          eventTypes: params.eventTypes?.split(','),
          levels: params.levels?.split(',') as AuditQuery['levels'],
          outcomes: params.outcomes?.split(',') as AuditQuery['outcomes'],
          userIds: params.userIds?.split(','),
          serviceIds: params.serviceIds?.split(','),
          resourceTypes: params.resourceTypes?.split(','),
          resourceIds: params.resourceIds?.split(','),
          correlationIds: params.correlationIds?.split(','),
          complianceFrameworks: params.complianceFrameworks?.split(',') as AuditQuery['complianceFrameworks'],
          complianceRelevant: params.complianceRelevant === 'true' ? true : params.complianceRelevant === 'false' ? false : undefined,
          legalHold: params.legalHold === 'true' ? true : params.legalHold === 'false' ? false : undefined,
          searchQuery: params.searchQuery,
          tags: params.tags?.split(','),
          limit: params.limit,
          offset: params.offset,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        };

        // Non-admin users can only see their tenant's events
        if (!req.auth!.roles.includes('admin') && !req.auth!.roles.includes('ombuds')) {
          query.tenantIds = [req.auth!.tenantId];
        }

        // Execute query
        const result = await store.queryEvents({
          startTime: query.startTime,
          endTime: query.endTime,
          tenantId: query.tenantIds?.[0],
          userIds: query.userIds,
          eventTypes: query.eventTypes,
          correlationIds: query.correlationIds,
          resourceIds: query.resourceIds,
          limit: query.limit,
          offset: query.offset,
        });

        const response: AuditQueryResult = {
          events: result.events,
          total: result.total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + result.events.length < result.total,
        };

        res.json(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * Get single audit event
   * GET /audit/events/:id
   */
  router.get(
    '/events/:id',
    extractAuth,
    requirePermission('audit:read'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;

        const result = await pool.query(
          `SELECT * FROM audit_events WHERE id = $1`,
          [id],
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Event not found' });
          return;
        }

        const event = result.rows[0];

        // Check tenant access
        if (
          !req.auth!.roles.includes('admin') &&
          !req.auth!.roles.includes('ombuds') &&
          event.tenant_id !== req.auth!.tenantId
        ) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        res.json(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * Export audit report
   * POST /audit/export
   */
  router.post(
    '/export',
    express.json(),
    extractAuth,
    requirePermission('audit:export'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Validate request
        const validation = ExportRequestSchema.safeParse(req.body);
        if (!validation.success) {
          res.status(400).json({ error: validation.error.message });
          return;
        }

        const params = validation.data;

        // Build query
        const result = await store.queryEvents({
          startTime: new Date(params.startTime),
          endTime: new Date(params.endTime),
          tenantId: req.auth!.roles.includes('admin') ? undefined : req.auth!.tenantId,
          userIds: params.userIds,
          eventTypes: params.eventTypes,
          limit: 10000, // Max export size
        });

        // Generate report
        const reportId = randomUUID();
        const reportData = params.format === 'json'
          ? JSON.stringify(result.events, null, 2)
          : params.format === 'csv'
            ? convertToCSV(result.events)
            : JSON.stringify(result.events); // PDF would need additional library

        // Calculate data hash
        const dataHash = createHash('sha256').update(reportData).digest('hex');

        // Sign the report
        const signature = createHmac('sha256', config.signingKey)
          .update(JSON.stringify({
            reportId,
            dataHash,
            generatedAt: new Date().toISOString(),
            generatedBy: req.auth!.userId,
          }))
          .digest('hex');

        const report: AuditExportReport = {
          id: reportId,
          generatedAt: new Date(),
          generatedBy: req.auth!.userId,
          period: {
            start: new Date(params.startTime),
            end: new Date(params.endTime),
          },
          query: {
            startTime: new Date(params.startTime),
            endTime: new Date(params.endTime),
            eventTypes: params.eventTypes,
            userIds: params.userIds,
            serviceIds: params.serviceIds,
            complianceFrameworks: params.complianceFrameworks as AuditQuery['complianceFrameworks'],
          },
          eventCount: result.events.length,
          format: params.format,
          dataHash,
          signature,
        };

        // Log the export
        await store.appendEvent({
          id: randomUUID(),
          eventType: 'audit_export',
          level: 'info',
          timestamp: new Date(),
          version: '1.0.0',
          correlationId: randomUUID(),
          tenantId: req.auth!.tenantId,
          serviceId: 'audit-blackbox-service',
          serviceName: 'Audit Black Box Service',
          environment: config.postgres.host.includes('prod') ? 'production' : 'development',
          userId: req.auth!.userId,
          action: 'export',
          outcome: 'success',
          message: `Audit report exported: ${result.events.length} events`,
          details: {
            reportId,
            format: params.format,
            eventCount: result.events.length,
            period: report.period,
          },
          criticalCategory: 'export',
          complianceRelevant: true,
          complianceFrameworks: ['SOC2', 'GDPR'],
        });

        // Return report
        if (params.format === 'json') {
          res.json({
            report,
            events: params.includeDetails ? result.events : undefined,
          });
        } else if (params.format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="audit-report-${reportId}.csv"`,
          );
          res.send(reportData);
        } else {
          res.json({ report, message: 'PDF export not yet implemented' });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * Verify audit trail integrity
   * GET /audit/integrity
   */
  router.get(
    '/integrity',
    extractAuth,
    requirePermission('audit:verify'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const startTime = req.query.startTime
          ? new Date(req.query.startTime as string)
          : undefined;
        const endTime = req.query.endTime
          ? new Date(req.query.endTime as string)
          : undefined;

        const result = await store.verifyIntegrity(startTime, endTime);

        // Log the verification
        await store.appendEvent({
          id: randomUUID(),
          eventType: 'audit_integrity_check',
          level: result.valid ? 'info' : 'critical',
          timestamp: new Date(),
          version: '1.0.0',
          correlationId: randomUUID(),
          tenantId: req.auth!.tenantId,
          serviceId: 'audit-blackbox-service',
          serviceName: 'Audit Black Box Service',
          environment: config.postgres.host.includes('prod') ? 'production' : 'development',
          userId: req.auth!.userId,
          action: 'integrity_check',
          outcome: result.valid ? 'success' : 'failure',
          message: result.valid
            ? 'Audit trail integrity verified'
            : `Audit trail integrity check failed: ${result.issues.length} issues found`,
          details: {
            totalEvents: result.summary.totalEvents,
            validEvents: result.summary.validEvents,
            invalidEvents: result.summary.invalidEvents,
            issueCount: result.issues.length,
          },
          complianceRelevant: true,
          complianceFrameworks: ['SOC2', 'ISO27001'],
        });

        res.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * Request data redaction (RTBF)
   * POST /audit/redact
   */
  router.post(
    '/redact',
    express.json(),
    extractAuth,
    requirePermission('audit:redact'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Validate request
        const validation = RedactionRequestSchema.safeParse(req.body);
        if (!validation.success) {
          res.status(400).json({ error: validation.error.message });
          return;
        }

        const params = validation.data;

        // Create redaction request
        const redactionRequest: RedactionRequest = {
          id: randomUUID(),
          requesterId: req.auth!.userId,
          tenantId: req.auth!.tenantId,
          subjectUserId: params.subjectUserId,
          reason: params.reason,
          legalBasis: params.legalBasis,
          verificationId: params.verificationId,
          fieldsToRedact: params.fieldsToRedact,
          requestedAt: new Date(),
          status: 'pending',
        };

        // Store redaction request
        await pool.query(
          `INSERT INTO audit_redaction_requests
           (id, requester_id, tenant_id, subject_user_id, reason, legal_basis, verification_id, fields_to_redact, requested_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            redactionRequest.id,
            redactionRequest.requesterId,
            redactionRequest.tenantId,
            redactionRequest.subjectUserId,
            redactionRequest.reason,
            redactionRequest.legalBasis,
            redactionRequest.verificationId,
            redactionRequest.fieldsToRedact,
            redactionRequest.requestedAt,
            redactionRequest.status,
          ],
        );

        // Log the request
        await store.appendEvent({
          id: randomUUID(),
          eventType: 'rtbf_request',
          level: 'warn',
          timestamp: new Date(),
          version: '1.0.0',
          correlationId: randomUUID(),
          tenantId: req.auth!.tenantId,
          serviceId: 'audit-blackbox-service',
          serviceName: 'Audit Black Box Service',
          environment: config.postgres.host.includes('prod') ? 'production' : 'development',
          userId: req.auth!.userId,
          action: 'redaction_request',
          outcome: 'pending',
          message: `RTBF request submitted for user ${params.subjectUserId}`,
          details: {
            requestId: redactionRequest.id,
            subjectUserId: params.subjectUserId,
            fieldsToRedact: params.fieldsToRedact,
            legalBasis: params.legalBasis,
          },
          criticalCategory: 'data_lifecycle',
          complianceRelevant: true,
          complianceFrameworks: ['GDPR', 'CCPA'],
        });

        res.status(202).json({
          message: 'Redaction request submitted for review',
          requestId: redactionRequest.id,
          status: 'pending',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  /**
   * Get redaction request status
   * GET /audit/redact/:id
   */
  router.get(
    '/redact/:id',
    extractAuth,
    requirePermission('audit:redact'),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;

        const result = await pool.query(
          `SELECT * FROM audit_redaction_requests WHERE id = $1`,
          [id],
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Redaction request not found' });
          return;
        }

        const request = result.rows[0];

        // Check tenant access
        if (
          !req.auth!.roles.includes('admin') &&
          request.tenant_id !== req.auth!.tenantId
        ) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        res.json(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    },
  );

  return router;
}

/**
 * Convert events to CSV format
 */
function convertToCSV(events: AuditEvent[]): string {
  if (events.length === 0) return '';

  const headers = [
    'id',
    'timestamp',
    'eventType',
    'level',
    'correlationId',
    'userId',
    'tenantId',
    'serviceId',
    'action',
    'outcome',
    'message',
    'resourceType',
    'resourceId',
    'ipAddress',
    'complianceRelevant',
  ];

  const rows = events.map((event) =>
    headers
      .map((header) => {
        const value = event[header as keyof AuditEvent];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      })
      .map((v) => `"${v}"`)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}
