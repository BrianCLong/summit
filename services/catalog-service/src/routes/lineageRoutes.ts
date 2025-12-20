/**
 * Lineage API Routes
 * Endpoints for data lineage visualization and analysis
 */

import { Router } from 'express';
import { LineageController } from '../controllers/LineageController.js';

export const lineageRouter = Router();
const controller = new LineageController();

/**
 * GET /api/v1/lineage/:assetId
 * Get lineage graph for asset
 */
lineageRouter.get('/:assetId', async (req, res, next) => {
  try {
    await controller.getLineage(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/lineage/:assetId/upstream
 * Get upstream lineage
 */
lineageRouter.get('/:assetId/upstream', async (req, res, next) => {
  try {
    await controller.getUpstreamLineage(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/lineage/:assetId/downstream
 * Get downstream lineage
 */
lineageRouter.get('/:assetId/downstream', async (req, res, next) => {
  try {
    await controller.getDownstreamLineage(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/lineage/:assetId/impact
 * Analyze impact of changes
 */
lineageRouter.get('/:assetId/impact', async (req, res, next) => {
  try {
    await controller.analyzeImpact(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/lineage/:assetId/column/:columnName
 * Get column-level lineage
 */
lineageRouter.get('/:assetId/column/:columnName', async (req, res, next) => {
  try {
    await controller.getColumnLineage(req, res);
  } catch (error) {
    next(error);
  }
});
