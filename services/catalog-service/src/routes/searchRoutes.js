"use strict";
/**
 * Search API Routes
 * Endpoints for semantic search and discovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const SearchController_js_1 = require("../controllers/SearchController.js");
exports.searchRouter = (0, express_1.Router)();
const controller = new SearchController_js_1.SearchController();
/**
 * GET /api/v1/search
 * Search catalog assets
 */
exports.searchRouter.get('/', async (req, res, next) => {
    try {
        await controller.search(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/search
 * Advanced search with filters
 */
exports.searchRouter.post('/', async (req, res, next) => {
    try {
        await controller.advancedSearch(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/search/suggestions
 * Get search suggestions
 */
exports.searchRouter.get('/suggestions', async (req, res, next) => {
    try {
        await controller.getSuggestions(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/search/click
 * Record search result click
 */
exports.searchRouter.post('/click', async (req, res, next) => {
    try {
        await controller.recordClick(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/search/fields
 * Search fields with advanced filters
 */
exports.searchRouter.post('/fields', async (req, res, next) => {
    try {
        await controller.searchFields(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/v1/search/impact
 * Perform impact analysis
 */
exports.searchRouter.post('/impact', async (req, res, next) => {
    try {
        await controller.performImpactAnalysis(req, res);
    }
    catch (error) {
        next(error);
    }
});
