/**
 * Quality Assessment Routes
 *
 * REST API endpoints for data quality assessment operations
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pool } from 'pg';
import { DataQualityEngine } from '@summit/data-quality';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { config } from '../config.js';

export function createQualityRouter(pool: Pool): Router {
  const router = Router();
  const engine = new DataQualityEngine(pool);
  const scorer = engine.getScorer();

  /**
   * @swagger
   * /api/v1/quality/assess:
   *   post:
   *     summary: Run comprehensive quality assessment
   *     tags: [Quality]
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
   *               config:
   *                 type: object
   *     responses:
   *       200:
   *         description: Quality assessment results
   *       400:
   *         description: Invalid request
   */
  router.post(
    '/assess',
    [
      body('tableName').isString().notEmpty().withMessage('Table name is required'),
      body('rules').isArray().withMessage('Rules must be an array'),
      body('config').optional().isObject().withMessage('Config must be an object'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { tableName, rules, config: assessConfig } = req.body;

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

      const result = await engine.assessDataQuality(tableName, rules, assessConfig);

      res.json({
        status: 'success',
        data: result,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/quality/score/{datasetId}:
   *   get:
   *     summary: Get quality score for a dataset
   *     tags: [Quality]
   *     parameters:
   *       - in: path
   *         name: datasetId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Quality score
   *       404:
   *         description: Score not found
   */
  router.get(
    '/score/:datasetId',
    [param('datasetId').isString().notEmpty().withMessage('Dataset ID is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { datasetId } = req.params;
      const score = await scorer.getScore(datasetId);

      if (!score) {
        throw new NotFoundError('Quality score', datasetId);
      }

      res.json({
        status: 'success',
        data: score,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/quality/scores:
   *   get:
   *     summary: Get quality scores with optional filters
   *     tags: [Quality]
   *     parameters:
   *       - in: query
   *         name: minScore
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxScore
   *         schema:
   *           type: number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: List of quality scores
   */
  router.get(
    '/scores',
    [
      query('minScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Invalid minScore'),
      query('maxScore').optional().isFloat({ min: 0, max: 100 }).withMessage('Invalid maxScore'),
      query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Invalid limit'),
      query('offset').optional().isInt({ min: 0 }).withMessage('Invalid offset'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { minScore, maxScore, limit = 100, offset = 0 } = req.query;

      const scores = await scorer.getScoresByRange(
        minScore ? parseFloat(minScore as string) : undefined,
        maxScore ? parseFloat(maxScore as string) : undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        status: 'success',
        data: scores,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          count: scores.length,
        },
      });
    })
  );

  /**
   * @swagger
   * /api/v1/quality/dashboard/{datasetId}:
   *   get:
   *     summary: Get quality dashboard data
   *     tags: [Quality]
   *     parameters:
   *       - in: path
   *         name: datasetId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Dashboard data
   */
  router.get(
    '/dashboard/:datasetId',
    [param('datasetId').isString().notEmpty().withMessage('Dataset ID is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { datasetId } = req.params;
      const dashboard = await engine.getQualityDashboard(datasetId);

      res.json({
        status: 'success',
        data: dashboard,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/quality/trends/{datasetId}:
   *   get:
   *     summary: Get quality score trends over time
   *     tags: [Quality]
   *     parameters:
   *       - in: path
   *         name: datasetId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           default: 30
   *     responses:
   *       200:
   *         description: Quality trends
   */
  router.get(
    '/trends/:datasetId',
    [
      param('datasetId').isString().notEmpty().withMessage('Dataset ID is required'),
      query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Invalid days'),
    ],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { datasetId } = req.params;
      const { days = 30 } = req.query;

      const trends = await scorer.getScoreTrends(datasetId, parseInt(days as string));

      res.json({
        status: 'success',
        data: trends,
      });
    })
  );

  /**
   * @swagger
   * /api/v1/quality/dimensions/{datasetId}:
   *   get:
   *     summary: Get quality dimensions breakdown
   *     tags: [Quality]
   *     parameters:
   *       - in: path
   *         name: datasetId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Quality dimensions
   */
  router.get(
    '/dimensions/:datasetId',
    [param('datasetId').isString().notEmpty().withMessage('Dataset ID is required')],
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError('Validation failed', errors.array());
      }

      const { datasetId } = req.params;
      const score = await scorer.getScore(datasetId);

      if (!score) {
        throw new NotFoundError('Quality score', datasetId);
      }

      res.json({
        status: 'success',
        data: {
          datasetId: score.datasetId,
          dimensions: score.dimensions,
          overallScore: score.overallScore,
          timestamp: score.timestamp,
        },
      });
    })
  );

  return router;
}
