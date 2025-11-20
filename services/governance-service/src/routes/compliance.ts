/**
 * Compliance Management Routes
 * API endpoints for compliance framework management and reporting
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataGovernanceEngine, ComplianceFramework } from '@summit/data-governance';
import {
  asyncHandler,
  NotFoundError,
  RequestValidationError,
} from '../middleware/error-handler.js';
import { authenticate, authorize } from '../middleware/auth.js';

/**
 * Create compliance router
 */
export function createComplianceRouter(governanceEngine: DataGovernanceEngine): Router {
  const router = Router();
  const complianceManager = governanceEngine.getComplianceManager();

  /**
   * @swagger
   * /compliance/frameworks:
   *   get:
   *     summary: List all compliance frameworks
   *     tags: [Compliance]
   *     parameters:
   *       - in: query
   *         name: enabled
   *         schema:
   *           type: boolean
   *         description: Filter by enabled status
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
   *         description: List of compliance frameworks
   */
  router.get(
    '/frameworks',
    authenticate,
    query('enabled').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { enabled, limit = 50, offset = 0 } = req.query;

      const frameworks = await complianceManager.listFrameworks({
        enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: frameworks,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: frameworks.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /compliance/frameworks/{id}:
   *   get:
   *     summary: Get compliance framework by ID
   *     tags: [Compliance]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Framework ID
   *     responses:
   *       200:
   *         description: Framework details
   *       404:
   *         description: Framework not found
   */
  router.get(
    '/frameworks/:id',
    authenticate,
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const framework = await complianceManager.getFramework(req.params.id);

      if (!framework) {
        throw new NotFoundError('Compliance framework', req.params.id);
      }

      res.json({
        success: true,
        data: framework,
      });
    })
  );

  /**
   * @swagger
   * /compliance/frameworks:
   *   post:
   *     summary: Register a new compliance framework
   *     tags: [Compliance]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - version
   *               - requirements
   *             properties:
   *               name:
   *                 type: string
   *                 example: GDPR
   *               description:
   *                 type: string
   *               version:
   *                 type: string
   *                 example: 1.0
   *               requirements:
   *                 type: array
   *                 items:
   *                   type: object
   *               enabled:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Framework registered successfully
   */
  router.post(
    '/frameworks',
    authenticate,
    authorize('admin', 'compliance-manager'),
    body('name').isString().isLength({ min: 2, max: 100 }),
    body('description').optional().isString(),
    body('version').isString(),
    body('requirements').isArray(),
    body('enabled').optional().isBoolean(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const framework: Omit<ComplianceFramework, 'id' | 'createdAt' | 'updatedAt'> = {
        name: req.body.name,
        description: req.body.description,
        version: req.body.version,
        requirements: req.body.requirements,
        enabled: req.body.enabled ?? true,
        metadata: req.body.metadata || {},
      };

      const registeredFramework = await governanceEngine.registerComplianceFramework(
        framework as ComplianceFramework
      );

      res.status(201).json({
        success: true,
        data: registeredFramework,
        message: 'Compliance framework registered successfully',
      });
    })
  );

  /**
   * @swagger
   * /compliance/frameworks/{id}:
   *   put:
   *     summary: Update a compliance framework
   *     tags: [Compliance]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Framework updated successfully
   *       404:
   *         description: Framework not found
   */
  router.put(
    '/frameworks/:id',
    authenticate,
    authorize('admin', 'compliance-manager'),
    param('id').isUUID(),
    body('name').optional().isString().isLength({ min: 2, max: 100 }),
    body('description').optional().isString(),
    body('version').optional().isString(),
    body('requirements').optional().isArray(),
    body('enabled').optional().isBoolean(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const existingFramework = await complianceManager.getFramework(req.params.id);
      if (!existingFramework) {
        throw new NotFoundError('Compliance framework', req.params.id);
      }

      const updates = {
        ...existingFramework,
        ...req.body,
        id: req.params.id,
        updatedAt: new Date(),
      };

      const updatedFramework = await complianceManager.updateFramework(req.params.id, updates);

      res.json({
        success: true,
        data: updatedFramework,
        message: 'Compliance framework updated successfully',
      });
    })
  );

  /**
   * @swagger
   * /compliance/frameworks/{id}:
   *   delete:
   *     summary: Delete a compliance framework
   *     tags: [Compliance]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Framework deleted successfully
   */
  router.delete(
    '/frameworks/:id',
    authenticate,
    authorize('admin'),
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const existingFramework = await complianceManager.getFramework(req.params.id);
      if (!existingFramework) {
        throw new NotFoundError('Compliance framework', req.params.id);
      }

      await complianceManager.deleteFramework(req.params.id);

      res.json({
        success: true,
        message: 'Compliance framework deleted successfully',
      });
    })
  );

  /**
   * @swagger
   * /compliance/assess/{frameworkId}:
   *   post:
   *     summary: Run compliance assessment
   *     tags: [Compliance]
   *     parameters:
   *       - in: path
   *         name: frameworkId
   *         required: true
   *         schema:
   *           type: string
   *         description: Framework ID to assess against
   *     responses:
   *       200:
   *         description: Assessment results
   *       404:
   *         description: Framework not found
   */
  router.post(
    '/assess/:frameworkId',
    authenticate,
    authorize('admin', 'compliance-manager', 'auditor'),
    param('frameworkId').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const framework = await complianceManager.getFramework(req.params.frameworkId);
      if (!framework) {
        throw new NotFoundError('Compliance framework', req.params.frameworkId);
      }

      const assessment = await governanceEngine.assessCompliance(req.params.frameworkId);

      res.json({
        success: true,
        data: assessment,
      });
    })
  );

  /**
   * @swagger
   * /compliance/reports:
   *   get:
   *     summary: Get compliance reports
   *     tags: [Compliance]
   *     parameters:
   *       - in: query
   *         name: frameworkId
   *         schema:
   *           type: string
   *         description: Filter by framework ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [COMPLIANT, NON_COMPLIANT, PARTIAL]
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
   *         description: List of compliance reports
   */
  router.get(
    '/reports',
    authenticate,
    query('frameworkId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const {
        frameworkId,
        startDate,
        endDate,
        status,
        limit = 50,
        offset = 0,
      } = req.query;

      const reports = await complianceManager.getReports({
        frameworkId: frameworkId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string | undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: reports,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: reports.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /compliance/reports/{id}:
   *   get:
   *     summary: Get compliance report by ID
   *     tags: [Compliance]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Report details
   *       404:
   *         description: Report not found
   */
  router.get(
    '/reports/:id',
    authenticate,
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const report = await complianceManager.getReport(req.params.id);

      if (!report) {
        throw new NotFoundError('Compliance report', req.params.id);
      }

      res.json({
        success: true,
        data: report,
      });
    })
  );

  return router;
}

export default createComplianceRouter;
