"use strict";
/**
 * Schema Registry API Routes
 * Endpoints for schema management, versioning, and compatibility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaRouter = void 0;
const express_1 = require("express");
const SchemaRegistryController_js_1 = require("../controllers/SchemaRegistryController.js");
exports.schemaRouter = (0, express_1.Router)();
const controller = new SchemaRegistryController_js_1.SchemaRegistryController();
/**
 * POST /api/v1/catalog/schemas
 * Register a new schema
 */
exports.schemaRouter.post('/', async (req, res, next) => {
    try {
        await controller.registerSchema(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/catalog/schemas/:id
 * Get schema by ID
 */
exports.schemaRouter.get('/:id', async (req, res, next) => {
    try {
        await controller.getSchema(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/catalog/schemas/:namespace/:name
 * Get schema by name and namespace
 */
exports.schemaRouter.get('/:namespace/:name', async (req, res, next) => {
    try {
        await controller.getSchemaByName(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/schemas/search
 * Search schemas
 */
exports.schemaRouter.post('/search', async (req, res, next) => {
    try {
        await controller.searchSchemas(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/schemas/:id/evolve
 * Evolve schema (create new version)
 */
exports.schemaRouter.post('/:id/evolve', async (req, res, next) => {
    try {
        await controller.evolveSchema(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/schemas/:id/deprecate
 * Deprecate schema
 */
exports.schemaRouter.post('/:id/deprecate', async (req, res, next) => {
    try {
        await controller.deprecateSchema(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/schemas/:id/archive
 * Archive schema
 */
exports.schemaRouter.post('/:id/archive', async (req, res, next) => {
    try {
        await controller.archiveSchema(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/catalog/schemas/:id/versions
 * Get schema versions
 */
exports.schemaRouter.get('/:id/versions', async (req, res, next) => {
    try {
        await controller.getSchemaVersions(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/catalog/schemas/:id/usage
 * Get schema usage statistics
 */
exports.schemaRouter.get('/:id/usage', async (req, res, next) => {
    try {
        await controller.getSchemaUsage(req, res);
    }
    catch (error) {
        next(error);
    }
});
