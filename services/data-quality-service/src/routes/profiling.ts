/**
 * Data Profiling Routes
 *
 * REST API endpoints for data profiling operations
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pool } from 'pg';
import { DataQualityEngine } from '@summit/data-quality';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { config } from '../config.js';

export function createProfilingRouter(pool: Pool): Router {
  const router = Router();
  const engine = new DataQualityEngine(pool);
  const profiler = engine.getProfiler();

  /**
   * @swagger
   * /api/v1/profiling/profile:
   *   post:
   *     summary: Profile a dataset
   *     tags: [Profiling]
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
   *               sampleSize:
   *                 type: integer
   *               includeDistribution:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Profiling results
   *       400:
   *         description: Invalid request
   */
  router.post(
    '/profile',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columns').optional().isArray().withMessage('Columns must be an array'),
      body('sampleSize').optional().isInt({ min: 1 }).withMessage('Invalid sample size'),
      body('includeDistribution')
        .optional()
        .isBoolean()
        .withMessage('includeDistribution must be boolean'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columns, sampleSize, includeDistribution } = req.body;

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

      const profilingConfig = {
        columns,
        sampleSize,
        includeDistribution,
      };

      const profiles = await profiler.profileDataset(tableName, profilingConfig);

      res.json({
        status: 'success',
        data: profiles,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/column:
   *   post:
   *     summary: Profile a specific column
   *     tags: [Profiling]
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
   *               sampleSize:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Column profile
   */
  router.post(
    '/column',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columnName').isString().notEmpty().withMessage('Column name is required'),
      body('sampleSize').optional().isInt({ min: 1 }).withMessage('Invalid sample size'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName, sampleSize } = req.body;

      const profile = await profiler.profileColumn(tableName, columnName, {
        sampleSize,
      });

      res.json({
        status: 'success',
        data: profile,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/statistics/{tableName}/{columnName}:
   *   get:
   *     summary: Get column statistics
   *     tags: [Profiling]
   *     parameters:
   *       - in: path
   *         name: tableName
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: columnName
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Column statistics
   */
  router.get(
    '/statistics/:tableName/:columnName',
    [
      param('tableName').isString().notEmpty().withMessage('Table name is required'),
      param('columnName').isString().notEmpty().withMessage('Column name is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName } = req.params;

      const statistics = await profiler.getColumnStatistics(tableName, columnName);

      res.json({
        status: 'success',
        data: statistics,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/distribution/{tableName}/{columnName}:
   *   get:
   *     summary: Get value distribution for a column
   *     tags: [Profiling]
   *     parameters:
   *       - in: path
   *         name: tableName
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: columnName
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *     responses:
   *       200:
   *         description: Value distribution
   */
  router.get(
    '/distribution/:tableName/:columnName',
    [
      param('tableName').isString().notEmpty().withMessage('Table name is required'),
      param('columnName').isString().notEmpty().withMessage('Column name is required'),
      query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Invalid limit'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName } = req.params;
      const { limit = 100 } = req.query;

      const distribution = await profiler.getValueDistribution(
        tableName,
        columnName,
        parseInt(limit as string)
      );

      res.json({
        status: 'success',
        data: distribution,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/patterns/{tableName}/{columnName}:
   *   get:
   *     summary: Detect patterns in column values
   *     tags: [Profiling]
   *     parameters:
   *       - in: path
   *         name: tableName
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: columnName
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Detected patterns
   */
  router.get(
    '/patterns/:tableName/:columnName',
    [
      param('tableName').isString().notEmpty().withMessage('Table name is required'),
      param('columnName').isString().notEmpty().withMessage('Column name is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, columnName } = req.params;

      const patterns = await profiler.detectPatterns(tableName, columnName);

      res.json({
        status: 'success',
        data: patterns,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/nulls/{tableName}:
   *   get:
   *     summary: Analyze null values across dataset
   *     tags: [Profiling]
   *     parameters:
   *       - in: path
   *         name: tableName
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Null analysis
   */
  router.get(
    '/nulls/:tableName',
    [param('tableName').isString().notEmpty().withMessage('Table name is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName } = req.params;

      const nullAnalysis = await profiler.analyzeNulls(tableName);

      res.json({
        status: 'success',
        data: nullAnalysis,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/duplicates/{tableName}:
   *   post:
   *     summary: Find duplicate records
   *     tags: [Profiling]
   *     parameters:
   *       - in: path
   *         name: tableName
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
   *               - columns
   *             properties:
   *               columns:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Duplicate analysis
   */
  router.post(
    '/duplicates/:tableName',
    [
      param('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columns').isArray().notEmpty().withMessage('Columns array is required'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName } = req.params;
      const { columns } = req.body;

      const duplicates = await profiler.findDuplicates(tableName, columns);

      res.json({
        status: 'success',
        data: duplicates,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/profiling/correlations/{tableName}:
   *   post:
   *     summary: Calculate column correlations
   *     tags: [Profiling]
   *     parameters:
   *       - in: path
   *         name: tableName
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               columns:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Correlation matrix
   */
  router.post(
    '/correlations/:tableName',
    [
      param('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('columns').optional().isArray().withMessage('Columns must be an array'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName } = req.params;
      const { columns } = req.body;

      const correlations = await profiler.calculateCorrelations(tableName, columns);

      res.json({
        status: 'success',
        data: correlations,
      });
    })
  );

  return router;
}
