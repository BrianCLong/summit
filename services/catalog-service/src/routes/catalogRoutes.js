"use strict";
/**
 * Catalog API Routes
 * Endpoints for catalog asset management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogRouter = void 0;
const express_1 = require("express");
const CatalogController_js_1 = require("../controllers/CatalogController.js");
exports.catalogRouter = (0, express_1.Router)();
const controller = new CatalogController_js_1.CatalogController();
/**
 * GET /api/v1/catalog/assets
 * List all assets with optional filters
 */
exports.catalogRouter.get('/assets', async (req, res, next) => {
    try {
        await controller.listAssets(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/catalog/assets/:id
 * Get asset by ID
 */
exports.catalogRouter.get('/assets/:id', async (req, res, next) => {
    try {
        await controller.getAsset(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/assets
 * Create new asset
 */
exports.catalogRouter.post('/assets', async (req, res, next) => {
    try {
        await controller.createAsset(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/v1/catalog/assets/:id
 * Update asset
 */
exports.catalogRouter.patch('/assets/:id', async (req, res, next) => {
    try {
        await controller.updateAsset(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/catalog/assets/:id
 * Delete asset
 */
exports.catalogRouter.delete('/assets/:id', async (req, res, next) => {
    try {
        await controller.deleteAsset(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/assets/:id/tags
 * Add tags to asset
 */
exports.catalogRouter.post('/assets/:id/tags', async (req, res, next) => {
    try {
        await controller.addTags(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/v1/catalog/assets/:id/tags
 * Remove tags from asset
 */
exports.catalogRouter.delete('/assets/:id/tags', async (req, res, next) => {
    try {
        await controller.removeTags(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/v1/catalog/assets/:id/owner
 * Update asset owner
 */
exports.catalogRouter.patch('/assets/:id/owner', async (req, res, next) => {
    try {
        await controller.updateOwner(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/assets/:id/deprecate
 * Deprecate asset
 */
exports.catalogRouter.post('/assets/:id/deprecate', async (req, res, next) => {
    try {
        await controller.deprecateAsset(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/catalog/assets/:id/relationships
 * Get asset relationships
 */
exports.catalogRouter.get('/assets/:id/relationships', async (req, res, next) => {
    try {
        await controller.getRelationships(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/catalog/relationships
 * Create relationship between assets
 */
exports.catalogRouter.post('/relationships', async (req, res, next) => {
    try {
        await controller.createRelationship(req, res);
    }
    catch (error) {
        next(error);
    }
});
