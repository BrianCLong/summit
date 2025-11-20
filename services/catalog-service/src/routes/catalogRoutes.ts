/**
 * Catalog API Routes
 * Endpoints for catalog asset management
 */

import { Router } from 'express';
import { CatalogController } from '../controllers/CatalogController.js';

export const catalogRouter = Router();
const controller = new CatalogController();

/**
 * GET /api/v1/catalog/assets
 * List all assets with optional filters
 */
catalogRouter.get('/assets', async (req, res, next) => {
  try {
    await controller.listAssets(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/assets/:id
 * Get asset by ID
 */
catalogRouter.get('/assets/:id', async (req, res, next) => {
  try {
    await controller.getAsset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/assets
 * Create new asset
 */
catalogRouter.post('/assets', async (req, res, next) => {
  try {
    await controller.createAsset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/catalog/assets/:id
 * Update asset
 */
catalogRouter.patch('/assets/:id', async (req, res, next) => {
  try {
    await controller.updateAsset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/catalog/assets/:id
 * Delete asset
 */
catalogRouter.delete('/assets/:id', async (req, res, next) => {
  try {
    await controller.deleteAsset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/assets/:id/tags
 * Add tags to asset
 */
catalogRouter.post('/assets/:id/tags', async (req, res, next) => {
  try {
    await controller.addTags(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/catalog/assets/:id/tags
 * Remove tags from asset
 */
catalogRouter.delete('/assets/:id/tags', async (req, res, next) => {
  try {
    await controller.removeTags(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/catalog/assets/:id/owner
 * Update asset owner
 */
catalogRouter.patch('/assets/:id/owner', async (req, res, next) => {
  try {
    await controller.updateOwner(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/assets/:id/deprecate
 * Deprecate asset
 */
catalogRouter.post('/assets/:id/deprecate', async (req, res, next) => {
  try {
    await controller.deprecateAsset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/assets/:id/relationships
 * Get asset relationships
 */
catalogRouter.get('/assets/:id/relationships', async (req, res, next) => {
  try {
    await controller.getRelationships(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/relationships
 * Create relationship between assets
 */
catalogRouter.post('/relationships', async (req, res, next) => {
  try {
    await controller.createRelationship(req, res);
  } catch (error) {
    next(error);
  }
});
