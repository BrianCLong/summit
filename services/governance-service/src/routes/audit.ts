/**
 * Audit Log Routes
 * API endpoints for querying and managing audit logs
 */

import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { DataGovernanceEngine } from '@summit/data-governance';
import {
  asyncHandler,
  NotFoundError,
  RequestValidationError,
} from '../middleware/error-handler.js';
import { authenticate, authorize } from '../middleware/auth.js';

/**
 * Create audit router
 */
export function createAuditRouter(governanceEngine: DataGovernanceEngine): Router {
  const router = Router();

  /**
   * @swagger
   * /audit/logs:
   *   get:
   *     summary: Query audit logs
   *     tags: [Audit]
   *     parameters:
   *       - in: query
   *         name: eventType
   *         schema:
   *           type: string
   *         description: Filter by event type
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter by user ID
   *       - in: query
   *         name: resource
   *         schema:
   *           type: string
   *         description: Filter by resource
   *       - in: query
   *         name: action
   *         schema:
   *           type: string
   *         description: Filter by action
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date for log query
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date for log query
   *       - in: query
   *         name: severity
   *         schema:
   *           type: string
   *           enum: [INFO, WARNING, ERROR, CRITICAL]
   *         description: Filter by severity level
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *           maximum: 1000
   *         description: Maximum number of results
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: List of audit logs
   */
  router.get(
    '/logs',
    authenticate,
    authorize('admin', 'auditor', 'compliance-manager'),
    query('eventType').optional().isString(),
    query('userId').optional().isString(),
    query('resource').optional().isString(),
    query('action').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('severity').optional().isIn(['INFO', 'WARNING', 'ERROR', 'CRITICAL']),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const {
        eventType,
        userId,
        resource,
        action,
        startDate,
        endDate,
        severity,
        limit = 100,
        offset = 0,
      } = req.query;

      // Query audit logs with filters
      const logs = await governanceEngine.getPolicyEngine().getAuditLogs({
        eventType: eventType as string | undefined,
        userId: userId as string | undefined,
        resource: resource as string | undefined,
        action: action as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        severity: severity as string | undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: logs.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /audit/logs/{id}:
   *   get:
   *     summary: Get audit log by ID
   *     tags: [Audit]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Audit log ID
   *     responses:
   *       200:
   *         description: Audit log details
   *       404:
   *         description: Audit log not found
   */
  router.get(
    '/logs/:id',
    authenticate,
    authorize('admin', 'auditor', 'compliance-manager'),
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const log = await governanceEngine.getPolicyEngine().getAuditLog(req.params.id);

      if (!log) {
        throw new NotFoundError('Audit log', req.params.id);
      }

      res.json({
        success: true,
        data: log,
      });
    })
  );

  /**
   * @swagger
   * /audit/events:
   *   get:
   *     summary: Get distinct event types
   *     tags: [Audit]
   *     responses:
   *       200:
   *         description: List of event types
   */
  router.get(
    '/events',
    authenticate,
    authorize('admin', 'auditor', 'compliance-manager'),
    asyncHandler(async (req: Request, res: Response) => {
      const eventTypes = await governanceEngine.getPolicyEngine().getEventTypes();

      res.json({
        success: true,
        data: eventTypes,
      });
    })
  );

  /**
   * @swagger
   * /audit/stats:
   *   get:
   *     summary: Get audit statistics
   *     tags: [Audit]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: groupBy
   *         schema:
   *           type: string
   *           enum: [eventType, userId, resource, action, severity, hour, day, week, month]
   *         description: Group statistics by field
   *     responses:
   *       200:
   *         description: Audit statistics
   */
  router.get(
    '/stats',
    authenticate,
    authorize('admin', 'auditor', 'compliance-manager'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['eventType', 'userId', 'resource', 'action', 'severity', 'hour', 'day', 'week', 'month']),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { startDate, endDate, groupBy = 'eventType' } = req.query;

      const stats = await governanceEngine.getPolicyEngine().getAuditStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        groupBy: groupBy as string,
      });

      res.json({
        success: true,
        data: stats,
      });
    })
  );

  /**
   * @swagger
   * /audit/timeline:
   *   get:
   *     summary: Get audit event timeline
   *     tags: [Audit]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: interval
   *         schema:
   *           type: string
   *           enum: [hour, day, week, month]
   *           default: day
   *         description: Time interval for grouping events
   *     responses:
   *       200:
   *         description: Event timeline data
   */
  router.get(
    '/timeline',
    authenticate,
    authorize('admin', 'auditor', 'compliance-manager'),
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('interval').optional().isIn(['hour', 'day', 'week', 'month']),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { startDate, endDate, interval = 'day' } = req.query;

      const timeline = await governanceEngine.getPolicyEngine().getAuditTimeline({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        interval: interval as string,
      });

      res.json({
        success: true,
        data: timeline,
      });
    })
  );

  /**
   * @swagger
   * /audit/export:
   *   get:
   *     summary: Export audit logs
   *     tags: [Audit]
   *     parameters:
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, xlsx]
   *           default: json
   *         description: Export format
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *       - in: query
   *         name: eventType
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Exported audit logs
   */
  router.get(
    '/export',
    authenticate,
    authorize('admin', 'auditor'),
    query('format').optional().isIn(['json', 'csv', 'xlsx']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('eventType').optional().isString(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { format = 'json', startDate, endDate, eventType } = req.query;

      const exportData = await governanceEngine.getPolicyEngine().exportAuditLogs({
        format: format as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        eventType: eventType as string | undefined,
      });

      // Set appropriate headers for download
      const contentTypes: Record<string, string> = {
        json: 'application/json',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const timestamp = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', contentTypes[format as string] || 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${timestamp}.${format}"`
      );

      res.send(exportData);
    })
  );

  /**
   * @swagger
   * /audit/search:
   *   post:
   *     summary: Advanced audit log search
   *     tags: [Audit]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               query:
   *                 type: string
   *                 description: Full-text search query
   *               filters:
   *                 type: object
   *                 description: Additional filters
   *               limit:
   *                 type: integer
   *                 default: 100
   *               offset:
   *                 type: integer
   *                 default: 0
   *     responses:
   *       200:
   *         description: Search results
   */
  router.post(
    '/search',
    authenticate,
    authorize('admin', 'auditor', 'compliance-manager'),
    asyncHandler(async (req: Request, res: Response) => {
      const { query: searchQuery, filters = {}, limit = 100, offset = 0 } = req.body;

      const results = await governanceEngine.getPolicyEngine().searchAuditLogs({
        query: searchQuery,
        filters,
        limit,
        offset,
      });

      res.json({
        success: true,
        data: results,
        pagination: {
          limit,
          offset,
          total: results.length,
        },
      });
    })
  );

  return router;
}

export default createAuditRouter;
