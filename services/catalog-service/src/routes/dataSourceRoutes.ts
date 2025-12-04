/**
 * Data Source API Routes
 * Endpoints for managing data sources, datasets, and fields
 */

import { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController.js';

export const dataSourceRouter = Router();
const controller = new DataSourceController();

// ========== Data Source Routes ==========

/**
 * POST /api/v1/catalog/sources
 * Register a new data source
 */
dataSourceRouter.post('/sources', async (req, res, next) => {
  try {
    await controller.registerSource(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/sources/:id
 * Get data source by ID
 */
dataSourceRouter.get('/sources/:id', async (req, res, next) => {
  try {
    await controller.getSource(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/sources
 * List all data sources
 */
dataSourceRouter.get('/sources', async (req, res, next) => {
  try {
    await controller.listSources(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/sources/:id/test
 * Test data source connection
 */
dataSourceRouter.post('/sources/:id/test', async (req, res, next) => {
  try {
    await controller.testConnection(req, res);
  } catch (error) {
    next(error);
  }
});

// ========== Dataset Routes ==========

/**
 * POST /api/v1/catalog/datasets
 * Register a new dataset
 */
dataSourceRouter.post('/datasets', async (req, res, next) => {
  try {
    await controller.registerDataset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/datasets/:id
 * Get dataset by ID
 */
dataSourceRouter.get('/datasets/:id', async (req, res, next) => {
  try {
    await controller.getDataset(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/datasets
 * List datasets
 */
dataSourceRouter.get('/datasets', async (req, res, next) => {
  try {
    await controller.listDatasets(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/datasets/search
 * Search datasets
 */
dataSourceRouter.get('/datasets/search', async (req, res, next) => {
  try {
    await controller.searchDatasets(req, res);
  } catch (error) {
    next(error);
  }
});

// ========== Field Routes ==========

/**
 * POST /api/v1/catalog/fields
 * Register a field
 */
dataSourceRouter.post('/fields', async (req, res, next) => {
  try {
    await controller.registerField(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/datasets/:datasetId/fields
 * List fields for a dataset
 */
dataSourceRouter.get('/datasets/:datasetId/fields', async (req, res, next) => {
  try {
    await controller.listFields(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/fields/search
 * Search fields
 */
dataSourceRouter.get('/fields/search', async (req, res, next) => {
  try {
    await controller.searchFields(req, res);
  } catch (error) {
    next(error);
  }
});

// ========== Lineage & Impact Routes ==========

/**
 * GET /api/v1/catalog/:entityType/:id/impact
 * Get impact analysis
 */
dataSourceRouter.get('/:entityType/:id/impact', async (req, res, next) => {
  try {
    await controller.getImpactAnalysis(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/:entityType/:id/lineage
 * Get lineage for an entity
 */
dataSourceRouter.get('/:entityType/:id/lineage', async (req, res, next) => {
  try {
    await controller.getLineage(req, res);
  } catch (error) {
    next(error);
  }
});

// ========== License Routes ==========

/**
 * POST /api/v1/catalog/datasets/:datasetId/licenses/:licenseId
 * Attach license to dataset
 */
dataSourceRouter.post(
  '/datasets/:datasetId/licenses/:licenseId',
  async (req, res, next) => {
    try {
      await controller.attachLicense(req, res);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/catalog/licenses/:licenseId/datasets
 * Get datasets by license
 */
dataSourceRouter.get('/licenses/:licenseId/datasets', async (req, res, next) => {
  try {
    await controller.getDatasetsByLicense(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/policy-tags/:tag/datasets
 * Get datasets by policy tag
 */
dataSourceRouter.get('/policy-tags/:tag/datasets', async (req, res, next) => {
  try {
    await controller.getDatasetsByPolicyTag(req, res);
  } catch (error) {
    next(error);
  }
});
