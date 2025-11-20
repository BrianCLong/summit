/**
 * Policy Management Routes
 * API endpoints for managing governance policies
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataGovernanceEngine, GovernancePolicy, PolicyType } from '@summit/data-governance';
import {
  asyncHandler,
  NotFoundError,
  RequestValidationError,
  AppError,
} from '../middleware/error-handler.js';
import { authenticate, authorize } from '../middleware/auth.js';

/**
 * Create policies router
 */
export function createPoliciesRouter(governanceEngine: DataGovernanceEngine): Router {
  const router = Router();
  const policyEngine = governanceEngine.getPolicyEngine();

  /**
   * @swagger
   * /policies:
   *   get:
   *     summary: List all policies
   *     tags: [Policies]
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [ACCESS_CONTROL, DATA_RETENTION, DATA_QUALITY, PRIVACY, CLASSIFICATION]
   *         description: Filter by policy type
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
   *         description: Maximum number of results
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: List of policies
   */
  router.get(
    '/',
    authenticate,
    query('type').optional().isIn(['ACCESS_CONTROL', 'DATA_RETENTION', 'DATA_QUALITY', 'PRIVACY', 'CLASSIFICATION']),
    query('enabled').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { type, enabled, limit = 50, offset = 0 } = req.query;

      const policies = await policyEngine.listPolicies({
        type: type as PolicyType | undefined,
        enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        data: policies,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: policies.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /policies/{id}:
   *   get:
   *     summary: Get policy by ID
   *     tags: [Policies]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     responses:
   *       200:
   *         description: Policy details
   *       404:
   *         description: Policy not found
   */
  router.get(
    '/:id',
    authenticate,
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const policy = await policyEngine.getPolicy(req.params.id);

      if (!policy) {
        throw new NotFoundError('Policy', req.params.id);
      }

      res.json({
        success: true,
        data: policy,
      });
    })
  );

  /**
   * @swagger
   * /policies:
   *   post:
   *     summary: Create a new policy
   *     tags: [Policies]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - type
   *               - rules
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [ACCESS_CONTROL, DATA_RETENTION, DATA_QUALITY, PRIVACY, CLASSIFICATION]
   *               rules:
   *                 type: object
   *               enabled:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Policy created successfully
   *       400:
   *         description: Validation error
   */
  router.post(
    '/',
    authenticate,
    authorize('admin', 'governance-manager'),
    body('name').isString().isLength({ min: 3, max: 255 }),
    body('description').optional().isString(),
    body('type').isIn(['ACCESS_CONTROL', 'DATA_RETENTION', 'DATA_QUALITY', 'PRIVACY', 'CLASSIFICATION']),
    body('rules').isObject(),
    body('enabled').optional().isBoolean(),
    body('priority').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const policy: Omit<GovernancePolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type,
        rules: req.body.rules,
        enabled: req.body.enabled ?? true,
        priority: req.body.priority ?? 100,
        metadata: req.body.metadata || {},
      };

      const createdPolicy = await policyEngine.registerPolicy(policy as GovernancePolicy);

      res.status(201).json({
        success: true,
        data: createdPolicy,
        message: 'Policy created successfully',
      });
    })
  );

  /**
   * @swagger
   * /policies/{id}:
   *   put:
   *     summary: Update a policy
   *     tags: [Policies]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Policy updated successfully
   *       404:
   *         description: Policy not found
   */
  router.put(
    '/:id',
    authenticate,
    authorize('admin', 'governance-manager'),
    param('id').isUUID(),
    body('name').optional().isString().isLength({ min: 3, max: 255 }),
    body('description').optional().isString(),
    body('rules').optional().isObject(),
    body('enabled').optional().isBoolean(),
    body('priority').optional().isInt({ min: 0 }),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const existingPolicy = await policyEngine.getPolicy(req.params.id);
      if (!existingPolicy) {
        throw new NotFoundError('Policy', req.params.id);
      }

      const updates = {
        ...existingPolicy,
        ...req.body,
        id: req.params.id,
        updatedAt: new Date(),
      };

      const updatedPolicy = await policyEngine.updatePolicy(req.params.id, updates);

      res.json({
        success: true,
        data: updatedPolicy,
        message: 'Policy updated successfully',
      });
    })
  );

  /**
   * @swagger
   * /policies/{id}:
   *   delete:
   *     summary: Delete a policy
   *     tags: [Policies]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Policy ID
   *     responses:
   *       200:
   *         description: Policy deleted successfully
   *       404:
   *         description: Policy not found
   */
  router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    param('id').isUUID(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const existingPolicy = await policyEngine.getPolicy(req.params.id);
      if (!existingPolicy) {
        throw new NotFoundError('Policy', req.params.id);
      }

      await policyEngine.deletePolicy(req.params.id);

      res.json({
        success: true,
        message: 'Policy deleted successfully',
      });
    })
  );

  /**
   * @swagger
   * /policies/evaluate:
   *   post:
   *     summary: Evaluate access policy
   *     tags: [Policies]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - resource
   *               - action
   *             properties:
   *               userId:
   *                 type: string
   *               resource:
   *                 type: string
   *               action:
   *                 type: string
   *               context:
   *                 type: object
   *     responses:
   *       200:
   *         description: Access evaluation result
   */
  router.post(
    '/evaluate',
    authenticate,
    body('userId').isString(),
    body('resource').isString(),
    body('action').isString(),
    body('context').optional().isObject(),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array());
      }

      const { userId, resource, action, context = {} } = req.body;

      const result = await governanceEngine.evaluateAccess(userId, resource, action, context);

      res.json({
        success: true,
        data: result,
      });
    })
  );

  return router;
}

export default createPoliciesRouter;
