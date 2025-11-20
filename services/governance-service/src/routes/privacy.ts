/**
 * Privacy Management Routes
 * API endpoints for privacy request workflows (GDPR, CCPA, etc.)
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataGovernanceEngine, PrivacyRequest } from '@summit/data-governance';
import {
  asyncHandler,
  NotFoundError,
  RequestValidationError,
} from '../middleware/error-handler.js';
import { authenticate, authorize } from '../middleware/auth.js';

/**
 * Create privacy router
 */
export function createPrivacyRouter(governanceEngine: DataGovernanceEngine): Router {
  const router = Router();
  const privacyManager = governanceEngine.getPrivacyManager();

  /**
   * @swagger
   * /privacy/requests:
   *   get:
   *     summary: List privacy requests
   *     tags: [Privacy]
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [ACCESS, ERASURE, RECTIFICATION, PORTABILITY, RESTRICTION, OBJECTION]
   *         description: Filter by request type
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [PENDING, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED]
   *         description: Filter by status
   *       - in: query
   *         name: subjectId
   *         schema:
   *           type: string
   *         description: Filter by subject ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: List of privacy requests
   */
  router.get(
    '/requests',
    authenticate,
    authorize('admin', 'privacy-officer', 'data-protection-officer'),
    query('type').optional().isIn(['ACCESS', 'ERASURE', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION']),
    query('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']),
    query('subjectId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { type, status, subjectId, limit = 50, offset = 0 } = req.query;

      const requests = await privacyManager.listRequests({
        type: type as PrivacyRequest['type'] | undefined,
        status: status as PrivacyRequest['status'] | undefined,
        subjectId: subjectId as string | undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: requests,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: requests.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /privacy/requests/{id}:
   *   get:
   *     summary: Get privacy request by ID
   *     tags: [Privacy]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Request details
   *       404:
   *         description: Request not found
   */
  router.get(
    '/requests/:id',
    authenticate,
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const request = await privacyManager.getRequest(req.params.id);

      if (!request) {
        throw new NotFoundError('Privacy request', req.params.id);
      }

      res.json({
        success: true,
        data: request,
      });
    })
  );

  /**
   * @swagger
   * /privacy/requests:
   *   post:
   *     summary: Submit a privacy request
   *     tags: [Privacy]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - type
   *               - subjectId
   *               - subjectEmail
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [ACCESS, ERASURE, RECTIFICATION, PORTABILITY, RESTRICTION, OBJECTION]
   *               subjectId:
   *                 type: string
   *                 description: ID of the data subject
   *               subjectEmail:
   *                 type: string
   *                 format: email
   *                 description: Email of the data subject
   *               details:
   *                 type: object
   *                 description: Additional request details
   *     responses:
   *       201:
   *         description: Privacy request submitted successfully
   */
  router.post(
    '/requests',
    authenticate,
    body('type').isIn(['ACCESS', 'ERASURE', 'RECTIFICATION', 'PORTABILITY', 'RESTRICTION', 'OBJECTION']),
    body('subjectId').isString().isLength({ min: 1 }),
    body('subjectEmail').isEmail(),
    body('details').optional().isObject(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { type, subjectId, subjectEmail, details = {} } = req.body;

      const request = await governanceEngine.submitPrivacyRequest(
        type,
        subjectId,
        subjectEmail,
        details
      );

      res.status(201).json({
        success: true,
        data: request,
        message: 'Privacy request submitted successfully',
      });
    })
  );

  /**
   * @swagger
   * /privacy/requests/{id}/status:
   *   put:
   *     summary: Update privacy request status
   *     tags: [Privacy]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [PENDING, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED]
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Status updated successfully
   */
  router.put(
    '/requests/:id/status',
    authenticate,
    authorize('admin', 'privacy-officer', 'data-protection-officer'),
    param('id').isUUID(),
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']),
    body('notes').optional().isString(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const existingRequest = await privacyManager.getRequest(req.params.id);
      if (!existingRequest) {
        throw new NotFoundError('Privacy request', req.params.id);
      }

      const { status, notes } = req.body;

      const updatedRequest = await privacyManager.updateRequestStatus(
        req.params.id,
        status,
        notes
      );

      res.json({
        success: true,
        data: updatedRequest,
        message: 'Privacy request status updated successfully',
      });
    })
  );

  /**
   * @swagger
   * /privacy/requests/{id}/process:
   *   post:
   *     summary: Process a privacy request
   *     tags: [Privacy]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Request processed successfully
   *       404:
   *         description: Request not found
   */
  router.post(
    '/requests/:id/process',
    authenticate,
    authorize('admin', 'privacy-officer', 'data-protection-officer'),
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const request = await privacyManager.getRequest(req.params.id);
      if (!request) {
        throw new NotFoundError('Privacy request', req.params.id);
      }

      // Process based on request type
      let result;
      switch (request.type) {
        case 'ERASURE':
          result = await governanceEngine.processErasureRequest(req.params.id);
          break;
        case 'ACCESS':
          result = await privacyManager.processAccessRequest(req.params.id);
          break;
        case 'PORTABILITY':
          result = await privacyManager.processPortabilityRequest(req.params.id);
          break;
        case 'RECTIFICATION':
          result = await privacyManager.processRectificationRequest(req.params.id);
          break;
        default:
          result = await privacyManager.processRequest(req.params.id);
      }

      res.json({
        success: true,
        data: result,
        message: `Privacy request processed successfully`,
      });
    })
  );

  /**
   * @swagger
   * /privacy/requests/{id}/export:
   *   get:
   *     summary: Export data for privacy request
   *     tags: [Privacy]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, xml]
   *           default: json
   *     responses:
   *       200:
   *         description: Data export
   *       404:
   *         description: Request not found
   */
  router.get(
    '/requests/:id/export',
    authenticate,
    param('id').isUUID(),
    query('format').optional().isIn(['json', 'csv', 'xml']),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const request = await privacyManager.getRequest(req.params.id);
      if (!request) {
        throw new NotFoundError('Privacy request', req.params.id);
      }

      const format = (req.query.format as string) || 'json';
      const exportData = await privacyManager.exportData(req.params.id, format);

      // Set appropriate content type
      const contentTypes: Record<string, string> = {
        json: 'application/json',
        csv: 'text/csv',
        xml: 'application/xml',
      };

      res.setHeader('Content-Type', contentTypes[format] || 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="privacy-request-${req.params.id}.${format}"`
      );

      res.send(exportData);
    })
  );

  /**
   * @swagger
   * /privacy/consents:
   *   get:
   *     summary: Get consent records
   *     tags: [Privacy]
   *     parameters:
   *       - in: query
   *         name: subjectId
   *         schema:
   *           type: string
   *       - in: query
   *         name: purpose
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: List of consent records
   */
  router.get(
    '/consents',
    authenticate,
    query('subjectId').optional().isString(),
    query('purpose').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { subjectId, purpose, limit = 50, offset = 0 } = req.query;

      const consents = await privacyManager.getConsents({
        subjectId: subjectId as string | undefined,
        purpose: purpose as string | undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: consents,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: consents.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /privacy/consents:
   *   post:
   *     summary: Record consent
   *     tags: [Privacy]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - subjectId
   *               - purpose
   *               - granted
   *             properties:
   *               subjectId:
   *                 type: string
   *               purpose:
   *                 type: string
   *               granted:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Consent recorded
   */
  router.post(
    '/consents',
    authenticate,
    body('subjectId').isString(),
    body('purpose').isString(),
    body('granted').isBoolean(),
    body('metadata').optional().isObject(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { subjectId, purpose, granted, metadata = {} } = req.body;

      const consent = await privacyManager.recordConsent(
        subjectId,
        purpose,
        granted,
        metadata
      );

      res.status(201).json({
        success: true,
        data: consent,
        message: 'Consent recorded successfully',
      });
    })
  );

  return router;
}

export default createPrivacyRouter;
