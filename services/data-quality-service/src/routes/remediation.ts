/**
 * Data Remediation Routes
 *
 * REST API endpoints for data quality remediation operations
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pool } from 'pg';
import { DataQualityEngine } from '@summit/data-quality';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { config } from '../config.js';

export function createRemediationRouter(pool: Pool): Router {
  const router = Router();
  const engine = new DataQualityEngine(pool);
  const remediator = engine.getRemediator();

  /**
   * @swagger
   * /api/v1/remediation/plan:
   *   post:
   *     summary: Create a remediation plan
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - validationResult
   *               - strategy
   *             properties:
   *               validationResult:
   *                 type: object
   *               strategy:
   *                 type: string
   *                 enum: [cleanse, standardize, deduplicate, impute, quarantine]
   *     responses:
   *       201:
   *         description: Remediation plan created
   */
  router.post(
    '/plan',
    [
      body('validationResult').isObject().withMessage('Validation result is required'),
      body('strategy')
        .isIn(['cleanse', 'standardize', 'deduplicate', 'impute', 'quarantine'])
        .withMessage('Invalid strategy'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { validationResult: valResult, strategy } = req.body;

      const plan = remediator.createRemediationPlan(valResult, strategy);

      res.status(201).json({
        status: 'success',
        data: plan,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/execute:
   *   post:
   *     summary: Execute a remediation plan
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - plan
   *             properties:
   *               plan:
   *                 type: object
   *               dryRun:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Remediation executed
   */
  router.post(
    '/execute',
    [
      body('plan').isObject().withMessage('Remediation plan is required'),
      body('dryRun').optional().isBoolean().withMessage('dryRun must be boolean'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { plan, dryRun = false } = req.body;

      if (!config.dataQuality.enableAutoRemediation && !dryRun) {
        throw new BadRequestError(
          'Auto-remediation is disabled. Use dryRun=true to preview changes.'
        );
      }

      const result = await remediator.executeRemediationPlan(plan, { dryRun });

      res.json({
        status: 'success',
        data: result,
        message: dryRun ? 'Dry run completed - no changes made' : 'Remediation completed',
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/cleanse:
   *   post:
   *     summary: Cleanse data (remove invalid values)
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - columnName
   *             properties:
   *               tableName:
   *                 type: string
   *               columnName:
   *                 type: string
   *               rules:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       200:
   *         description: Data cleansed
   */
  router.post(
    '/cleanse',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columnName').isString().notEmpty().withMessage('Column name is required'),
      body('rules').optional().isArray().withMessage('Rules must be an array'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName, rules } = req.body;

      const result = await remediator.cleanseData(tableName, columnName, rules);

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/standardize:
   *   post:
   *     summary: Standardize data format
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - columnName
   *               - format
   *             properties:
   *               tableName:
   *                 type: string
   *               columnName:
   *                 type: string
   *               format:
   *                 type: string
   *     responses:
   *       200:
   *         description: Data standardized
   */
  router.post(
    '/standardize',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columnName').isString().notEmpty().withMessage('Column name is required'),
      body('format').isString().notEmpty().withMessage('Format is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName, format } = req.body;

      const result = await remediator.standardizeData(tableName, columnName, format);

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/deduplicate:
   *   post:
   *     summary: Remove duplicate records
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - keyColumns
   *             properties:
   *               tableName:
   *                 type: string
   *               keyColumns:
   *                 type: array
   *                 items:
   *                   type: string
   *               strategy:
   *                 type: string
   *                 enum: [keep_first, keep_last, keep_newest, merge]
   *     responses:
   *       200:
   *         description: Duplicates removed
   */
  router.post(
    '/deduplicate',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('keyColumns').isArray().notEmpty().withMessage('Key columns are required'),
      body('strategy')
        .optional()
        .isIn(['keep_first', 'keep_last', 'keep_newest', 'merge'])
        .withMessage('Invalid strategy'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, keyColumns, strategy = 'keep_first' } = req.body;

      const result = await remediator.deduplicateData(tableName, keyColumns, strategy);

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/impute:
   *   post:
   *     summary: Impute missing values
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - columnName
   *               - method
   *             properties:
   *               tableName:
   *                 type: string
   *               columnName:
   *                 type: string
   *               method:
   *                 type: string
   *                 enum: [mean, median, mode, forward_fill, backward_fill, constant]
   *               value:
   *                 type: any
   *     responses:
   *       200:
   *         description: Missing values imputed
   */
  router.post(
    '/impute',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columnName').isString().notEmpty().withMessage('Column name is required'),
      body('method')
        .isIn(['mean', 'median', 'mode', 'forward_fill', 'backward_fill', 'constant'])
        .withMessage('Invalid imputation method'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName, method, value } = req.body;

      const result = await remediator.imputeMissingValues(tableName, columnName, method, value);

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/quarantine:
   *   post:
   *     summary: Quarantine problematic records
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - condition
   *             properties:
   *               tableName:
   *                 type: string
   *               condition:
   *                 type: string
   *               quarantineTable:
   *                 type: string
   *     responses:
   *       200:
   *         description: Records quarantined
   */
  router.post(
    '/quarantine',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('condition').isString().notEmpty().withMessage('Condition is required'),
      body('quarantineTable').optional().isString().withMessage('Invalid quarantine table'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, condition, quarantineTable } = req.body;

      const result = await remediator.quarantineRecords(
        tableName,
        condition,
        quarantineTable || `${tableName}_quarantine`
      );

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/history/{datasetId}:
   *   get:
   *     summary: Get remediation history for a dataset
   *     tags: [Remediation]
   *     parameters:
   *       - in: path
   *         name: datasetId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *     responses:
   *       200:
   *         description: Remediation history
   */
  router.get(
    '/history/:datasetId',
    [
      param('datasetId').isString().notEmpty().withMessage('Dataset ID is required'),
      query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Invalid limit'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { datasetId } = req.params;
      const { limit = 50 } = req.query;

      const history = await remediator.getRemediationHistory(
        datasetId,
        parseInt(limit as string)
      );

      res.json({
        status: 'success',
        data: history,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/rollback/{remediationId}:
   *   post:
   *     summary: Rollback a remediation action
   *     tags: [Remediation]
   *     parameters:
   *       - in: path
   *         name: remediationId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Remediation rolled back
   */
  router.post(
    '/rollback/:remediationId',
    [param('remediationId').isString().notEmpty().withMessage('Remediation ID is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { remediationId } = req.params;

      const result = await remediator.rollbackRemediation(remediationId);

      if (!result) {
        throw new NotFoundError('Remediation', remediationId);
      }

      res.json({
        status: 'success',
        message: 'Remediation rolled back successfully',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/remediation/preview:
   *   post:
   *     summary: Preview remediation impact (dry run)
   *     tags: [Remediation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - strategy
   *             properties:
   *               tableName:
   *                 type: string
   *               strategy:
   *                 type: string
   *               config:
   *                 type: object
   *     responses:
   *       200:
   *         description: Remediation preview
   */
  router.post(
    '/preview',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('strategy').isString().notEmpty().withMessage('Strategy is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, strategy, config: strategyConfig } = req.body;

      const preview = await remediator.previewRemediation(
        tableName,
        strategy,
        strategyConfig
      );

      res.json({
        status: 'success',
        data: preview,
      });
    })
  );

  return router;
}
