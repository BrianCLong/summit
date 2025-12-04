/**
 * Schema Registry API Routes
 * Endpoints for schema management, versioning, and compatibility
 */

import { Router } from 'express';
import { SchemaRegistryController } from '../controllers/SchemaRegistryController.js';

export const schemaRouter = Router();
const controller = new SchemaRegistryController();

/**
 * POST /api/v1/catalog/schemas
 * Register a new schema
 */
schemaRouter.post('/', async (req, res, next) => {
  try {
    await controller.registerSchema(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/schemas/:id
 * Get schema by ID
 */
schemaRouter.get('/:id', async (req, res, next) => {
  try {
    await controller.getSchema(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/schemas/:namespace/:name
 * Get schema by name and namespace
 */
schemaRouter.get('/:namespace/:name', async (req, res, next) => {
  try {
    await controller.getSchemaByName(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/schemas/search
 * Search schemas
 */
schemaRouter.post('/search', async (req, res, next) => {
  try {
    await controller.searchSchemas(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/schemas/:id/evolve
 * Evolve schema (create new version)
 */
schemaRouter.post('/:id/evolve', async (req, res, next) => {
  try {
    await controller.evolveSchema(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/schemas/:id/deprecate
 * Deprecate schema
 */
schemaRouter.post('/:id/deprecate', async (req, res, next) => {
  try {
    await controller.deprecateSchema(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/catalog/schemas/:id/archive
 * Archive schema
 */
schemaRouter.post('/:id/archive', async (req, res, next) => {
  try {
    await controller.archiveSchema(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/schemas/:id/versions
 * Get schema versions
 */
schemaRouter.get('/:id/versions', async (req, res, next) => {
  try {
    await controller.getSchemaVersions(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/catalog/schemas/:id/usage
 * Get schema usage statistics
 */
schemaRouter.get('/:id/usage', async (req, res, next) => {
  try {
    await controller.getSchemaUsage(req, res);
  } catch (error) {
    next(error);
  }
});
