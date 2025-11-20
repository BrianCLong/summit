/**
 * Data Validation Routes
 *
 * REST API endpoints for data validation operations
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pool } from 'pg';
import { DataQualityEngine } from '@summit/data-quality';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { config } from '../config.js';

export function createValidationRouter(pool: Pool): Router {
  const router = Router();
  const engine = new DataQualityEngine(pool);
  const validator = engine.getValidator();

  /**
   * @swagger
   * /api/v1/validation/rules:
   *   post:
   *     summary: Register a validation rule
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - id
   *               - name
   *               - type
   *               - column
   *             properties:
   *               id:
   *                 type: string
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               type:
   *                 type: string
   *               column:
   *                 type: string
   *               config:
   *                 type: object
   *               severity:
   *                 type: string
   *                 enum: [critical, high, medium, low]
   *     responses:
   *       201:
   *         description: Rule registered
   */
  router.post(
    '/rules',
    [
      body('id').isString().notEmpty().withMessage('Rule ID is required'),
      body('name').isString().notEmpty().withMessage('Rule name is required'),
      body('type').isString().notEmpty().withMessage('Rule type is required'),
      body('column').isString().notEmpty().withMessage('Column is required'),
      body('severity')
        .optional()
        .isIn(['critical', 'high', 'medium', 'low'])
        .withMessage('Invalid severity'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const rule = req.body;
      validator.registerRule(rule);

      res.status(201).json({
        status: 'success',
        message: 'Rule registered successfully',
        data: rule,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/rules:
   *   get:
   *     summary: Get all registered rules
   *     tags: [Validation]
   *     responses:
   *       200:
   *         description: List of rules
   */
  router.get(
    '/rules',
    asyncHandler(async (req: Request, res: Response) => {
      const rules = validator.getRules();

      res.json({
        status: 'success',
        data: rules,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/rules/{ruleId}:
   *   delete:
   *     summary: Remove a validation rule
   *     tags: [Validation]
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Rule removed
   */
  router.delete(
    '/rules/:ruleId',
    [param('ruleId').isString().notEmpty().withMessage('Rule ID is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { ruleId } = req.params;
      const removed = validator.removeRule(ruleId);

      if (!removed) {
        throw new NotFoundError('Rule', ruleId);
      }

      res.json({
        status: 'success',
        message: 'Rule removed successfully',
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/validate:
   *   post:
   *     summary: Validate dataset against registered rules
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *             properties:
   *               tableName:
   *                 type: string
   *               batchSize:
   *                 type: integer
   *               stopOnError:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Validation results
   */
  router.post(
    '/validate',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('batchSize').optional().isInt({ min: 1 }).withMessage('Invalid batch size'),
      body('stopOnError').optional().isBoolean().withMessage('stopOnError must be boolean'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, batchSize, stopOnError } = req.body;

      // Check if table exists
      const tableCheck = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [tableName]
      );

      if (!tableCheck.rows[0].exists) {
        throw new NotFoundError('Table', tableName);
      }

      const validationConfig = {
        batchSize,
        stopOnError,
      };

      const results = await validator.validate(tableName, validationConfig);

      res.json({
        status: 'success',
        data: results,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/validate-column:
   *   post:
   *     summary: Validate a specific column
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - columnName
   *               - ruleType
   *             properties:
   *               tableName:
   *                 type: string
   *               columnName:
   *                 type: string
   *               ruleType:
   *                 type: string
   *               config:
   *                 type: object
   *     responses:
   *       200:
   *         description: Column validation results
   */
  router.post(
    '/validate-column',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columnName').isString().notEmpty().withMessage('Column name is required'),
      body('ruleType').isString().notEmpty().withMessage('Rule type is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName, ruleType, config: ruleConfig } = req.body;

      const result = await validator.validateColumn(
        tableName,
        columnName,
        ruleType,
        ruleConfig
      );

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/check-completeness:
   *   post:
   *     summary: Check data completeness
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *             properties:
   *               tableName:
   *                 type: string
   *               columns:
   *                 type: array
   *                 items:
   *                   type: string
   *               threshold:
   *                 type: number
   *     responses:
   *       200:
   *         description: Completeness check results
   */
  router.post(
    '/check-completeness',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columns').optional().isArray().withMessage('Columns must be an array'),
      body('threshold')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('Threshold must be between 0 and 1'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columns, threshold } = req.body;

      const completeness = await validator.checkCompleteness(tableName, columns, threshold);

      res.json({
        status: 'success',
        data: completeness,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/check-consistency:
   *   post:
   *     summary: Check data consistency across columns
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - rules
   *             properties:
   *               tableName:
   *                 type: string
   *               rules:
   *                 type: array
   *                 items:
   *                   type: object
   *     responses:
   *       200:
   *         description: Consistency check results
   */
  router.post(
    '/check-consistency',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('rules').isArray().notEmpty().withMessage('Rules array is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, rules } = req.body;

      const consistency = await validator.checkConsistency(tableName, rules);

      res.json({
        status: 'success',
        data: consistency,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/check-uniqueness:
   *   post:
   *     summary: Check uniqueness constraints
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tableName
   *               - columns
   *             properties:
   *               tableName:
   *                 type: string
   *               columns:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Uniqueness check results
   */
  router.post(
    '/check-uniqueness',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columns').isArray().notEmpty().withMessage('Columns array is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columns } = req.body;

      const uniqueness = await validator.checkUniqueness(tableName, columns);

      res.json({
        status: 'success',
        data: uniqueness,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/check-referential-integrity:
   *   post:
   *     summary: Check referential integrity between tables
   *     tags: [Validation]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sourceTable
   *               - sourceColumn
   *               - targetTable
   *               - targetColumn
   *             properties:
   *               sourceTable:
   *                 type: string
   *               sourceColumn:
   *                 type: string
   *               targetTable:
   *                 type: string
   *               targetColumn:
   *                 type: string
   *     responses:
   *       200:
   *         description: Referential integrity check results
   */
  router.post(
    '/check-referential-integrity',
    [
      body('sourceTable').isString().notEmpty().withMessage('Source table is required'),
      body('sourceColumn').isString().notEmpty().withMessage('Source column is required'),
      body('targetTable').isString().notEmpty().withMessage('Target table is required'),
      body('targetColumn').isString().notEmpty().withMessage('Target column is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { sourceTable, sourceColumn, targetTable, targetColumn } = req.body;

      const integrity = await validator.checkReferentialIntegrity(
        sourceTable,
        sourceColumn,
        targetTable,
        targetColumn
      );

      res.json({
        status: 'success',
        data: integrity,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/validation/results/{validationId}:
   *   get:
   *     summary: Get validation results by ID
   *     tags: [Validation]
   *     parameters:
   *       - in: path
   *         name: validationId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Validation results
   *       404:
   *         description: Results not found
   */
  router.get(
    '/results/:validationId',
    [param('validationId').isString().notEmpty().withMessage('Validation ID is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { validationId } = req.params;
      const results = await validator.getValidationResults(validationId);

      if (!results) {
        throw new NotFoundError('Validation results', validationId);
      }

      res.json({
        status: 'success',
        data: results,
      });
    })
  );

  return router;
}
